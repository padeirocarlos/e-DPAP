package mz.gov.dpap.service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import mz.gov.dpap.domain.AppUser;
import mz.gov.dpap.domain.AuditAction;
import mz.gov.dpap.domain.Role;
import mz.gov.dpap.domain.Submission;
import mz.gov.dpap.domain.SubmissionAction;
import mz.gov.dpap.domain.SubmissionStatus;
import mz.gov.dpap.domain.SyncStatus;
import mz.gov.dpap.domain.ReviewComment;
import mz.gov.dpap.dto.PageResponse;
import mz.gov.dpap.dto.QcFlagDto;
import mz.gov.dpap.dto.ReviewCommentDto;
import mz.gov.dpap.dto.SubmissionDto;
import mz.gov.dpap.dto.SubmissionRequest;
import mz.gov.dpap.dto.TransitionRequest;
import mz.gov.dpap.form.FormService;
import mz.gov.dpap.repository.AppUserRepository;
import mz.gov.dpap.repository.QcFlagRepository;
import mz.gov.dpap.repository.ReviewCommentRepository;
import mz.gov.dpap.repository.SubmissionRepository;
import mz.gov.dpap.service.exception.ConflictException;
import mz.gov.dpap.service.exception.NotFoundException;
import mz.gov.dpap.service.exception.StaleVersionException;
import mz.gov.dpap.service.exception.ValidationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Submission capture + the BRD §4.2 workflow state machine. Transitions enforce
 * the allowed state graph ({@link SubmissionStatus#canTransitionTo}), per-action
 * role authorization (§3.3), optimistic concurrency, and — on SUBMIT — the
 * server-side re-validation of required/relevant fields (BR-RT-2, FR-FORM-4).
 */
@Service
public class SubmissionService {

    private static final Set<Role> REVIEW_ROLES =
            Set.of(Role.SUPERVISOR, Role.DATA_MANAGER, Role.SYS_ADMIN);
    private static final Set<Role> PUBLISH_ROLES = Set.of(Role.DATA_MANAGER, Role.SYS_ADMIN);

    private final SubmissionRepository repo;
    private final AppUserRepository users;
    private final FormService forms;
    private final AuditService audit;
    private final QcService qc;
    private final ExtractionService extraction;
    private final RegistryService registry;
    private final QcFlagRepository qcFlags;
    private final ReviewCommentRepository comments;

    public SubmissionService(SubmissionRepository repo, AppUserRepository users,
                             FormService forms, AuditService audit, QcService qc,
                             ExtractionService extraction, RegistryService registry,
                             QcFlagRepository qcFlags, ReviewCommentRepository comments) {
        this.repo = repo;
        this.users = users;
        this.forms = forms;
        this.audit = audit;
        this.qc = qc;
        this.extraction = extraction;
        this.registry = registry;
        this.qcFlags = qcFlags;
        this.comments = comments;
    }

    public record SubmissionFilters(
            SubmissionStatus status, String districtCode, Integer actorType,
            boolean mine, Integer page, Integer pageSize) {
    }

    @Transactional
    public SubmissionDto create(SubmissionRequest req, Authentication auth) {
        AppUser actor = currentUser(auth);

        // Idempotent sync: a repeat of the same client_uuid updates in place (NFR-9).
        Submission s = req.clientUuid() != null
                ? repo.findByClientUuid(req.clientUuid()).orElseGet(Submission::new)
                : new Submission();

        boolean isNew = s.getId() == null;
        s.setClientUuid(req.clientUuid());
        s.setRoundId(req.roundId());
        s.setFormVersion(req.formVersion() != null ? req.formVersion() : forms.version());
        s.setDistrictCode(req.districtCode());
        s.setAnswers(req.answers() != null ? req.answers() : Map.of());
        s.setDeviceId(req.deviceId());
        s.setAppVersion(req.appVersion());
        s.setSyncStatus(SyncStatus.SYNCED);
        if (isNew) {
            s.setEnumeratorId(actor.getId());
            s.setCreatedBy(actor.getEmail());
        }
        s.setUpdatedBy(actor.getEmail());
        applyDerivedKeys(s);

        if (req.submit()) {
            revalidate(s);
            s.setStatus(SubmissionStatus.SUBMITTED);
            s.setSubmittedAt(Instant.now());
        } else {
            s.setStatus(SubmissionStatus.DRAFT);
        }

        Submission saved = repo.saveAndFlush(s);
        if (req.submit()) {
            onSubmitted(saved);
        }
        audit.record(AuditAction.CREATE, "SUBMISSION", saved.getId().toString(),
                "Submissão " + saved.getStatus(), actor.getEmail());
        return toDto(saved, qcFlags.countBySubmissionId(saved.getId()));
    }

    @Transactional(readOnly = true)
    public SubmissionDto get(UUID id) {
        return toDto(require(id), qcFlags.countBySubmissionId(id));
    }

    @Transactional(readOnly = true)
    public PageResponse<SubmissionDto> list(SubmissionFilters f, Authentication auth) {
        int p = f.page() == null || f.page() < 1 ? 1 : f.page();
        int size = f.pageSize() == null || f.pageSize() < 1 ? 25 : Math.min(f.pageSize(), 200);
        UUID mineId = f.mine() ? currentUser(auth).getId() : null;

        Specification<Submission> spec = (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> ps = new ArrayList<>();
            if (f.status() != null) {
                ps.add(cb.equal(root.get("status"), f.status()));
            }
            if (f.districtCode() != null && !f.districtCode().isBlank()) {
                ps.add(cb.equal(root.get("districtCode"), f.districtCode()));
            }
            if (f.actorType() != null) {
                ps.add(cb.equal(root.get("actorType"), f.actorType()));
            }
            if (mineId != null) {
                ps.add(cb.equal(root.get("enumeratorId"), mineId));
            }
            return cb.and(ps.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };

        Page<Submission> result = repo.findAll(spec,
                PageRequest.of(p - 1, size, Sort.by(Sort.Direction.DESC, "updatedAt")));
        List<Submission> content = result.getContent();
        java.util.Map<UUID, Long> flagCounts = new java.util.HashMap<>();
        if (!content.isEmpty()) {
            for (Object[] row : qcFlags.countBySubmissionIdIn(content.stream().map(Submission::getId).toList())) {
                flagCounts.put((UUID) row[0], (Long) row[1]);
            }
        }
        List<SubmissionDto> items = content.stream()
                .map(s -> toDto(s, flagCounts.getOrDefault(s.getId(), 0L)))
                .toList();
        return new PageResponse<>(items, p, size, result.getTotalElements());
    }

    @Transactional
    public SubmissionDto transition(UUID id, TransitionRequest req, Authentication auth) {
        AppUser actor = currentUser(auth);
        Submission s = require(id);

        if (req.version() != null && !req.version().equals(s.getVersion())) {
            throw new StaleVersionException("Submission was modified by someone else");
        }

        SubmissionAction action = req.action();
        SubmissionStatus target = action.target();
        if (!s.getStatus().canTransitionTo(target)) {
            throw new ConflictException(
                    "Transição inválida: " + s.getStatus() + " → " + action);
        }
        authorizeTransition(action, s, actor);
        if (action.requiresReason() && (req.reason() == null || req.reason().isBlank())) {
            throw new ValidationException("É obrigatório indicar o motivo.");
        }
        if (action == SubmissionAction.SUBMIT) {
            revalidate(s);
        }

        Instant now = Instant.now();
        s.setStatus(target);
        s.setUpdatedBy(actor.getEmail());
        switch (action) {
            case SUBMIT -> s.setSubmittedAt(now);
            case OPEN_REVIEW -> s.setSupervisorId(actor.getId());
            case APPROVE, RETURN, REJECT -> s.setReviewedAt(now);
            case PUBLISH -> s.setPublishedAt(now);
            default -> { }
        }

        // PUBLISH: create/link the master actor and extract network + programmes.
        if (action == SubmissionAction.PUBLISH) {
            var published = registry.publishFromSubmission(s);
            s.setActorId(published.getId());
            extraction.extractNetwork(s, published.getId());
            extraction.extractProgrammes(s, published.getId());
        }

        Submission saved = repo.saveAndFlush(s);

        // RETURN / REJECT record the reason as a review comment (FR-QC-3/4).
        if (action.requiresReason()) {
            ReviewComment c = new ReviewComment();
            c.setSubmissionId(saved.getId());
            c.setComment(req.reason());
            c.setAuthor(actor.getEmail());
            c.setStatus(action.name());
            comments.save(c);
        }
        // Re-run QC when (re)submitted and refresh extracted rosters.
        if (action == SubmissionAction.SUBMIT) {
            onSubmitted(saved);
        }

        String summary = "Submissão " + action
                + (req.reason() != null && !req.reason().isBlank() ? ": " + req.reason() : "");
        audit.record(AuditAction.UPDATE, "SUBMISSION", saved.getId().toString(), summary,
                actor.getEmail());
        return toDto(saved, qcFlags.countBySubmissionId(saved.getId()));
    }

    // --- QC / review / duplicates (read + add comment) ----------------------

    @Transactional(readOnly = true)
    public List<QcFlagDto> qcFlags(UUID id) {
        require(id);
        return qcFlags.findBySubmissionIdOrderByCreatedAtAsc(id).stream()
                .map(f -> new QcFlagDto(f.getId().toString(), f.getRuleId(), f.getSeverity().name(),
                        f.getMessage(), f.isResolved()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ReviewCommentDto> comments(UUID id) {
        require(id);
        return comments.findBySubmissionIdOrderByCreatedAtAsc(id).stream()
                .map(c -> new ReviewCommentDto(c.getId().toString(), c.getField(), c.getComment(),
                        c.getAuthor(), c.getStatus(), c.getCreatedAt()))
                .toList();
    }

    @Transactional
    public ReviewCommentDto addComment(UUID id, String field, String comment, Authentication auth) {
        AppUser actor = currentUser(auth);
        require(id);
        if (comment == null || comment.isBlank()) {
            throw new ValidationException("O comentário não pode estar vazio.");
        }
        ReviewComment c = new ReviewComment();
        c.setSubmissionId(id);
        c.setField(field);
        c.setComment(comment);
        c.setAuthor(actor.getEmail());
        ReviewComment saved = comments.save(c);
        return new ReviewCommentDto(saved.getId().toString(), saved.getField(), saved.getComment(),
                saved.getAuthor(), saved.getStatus(), saved.getCreatedAt());
    }

    // --- internals ----------------------------------------------------------

    /** Hook after a submission reaches SUBMITTED: run QC + extract roster rows. */
    private void onSubmitted(Submission s) {
        qc.runChecks(s);
        extraction.extractRosters(s);
    }

    private void authorizeTransition(SubmissionAction action, Submission s, AppUser actor) {
        Role role = actor.getRole();
        boolean ok = switch (action) {
            case SUBMIT -> role == Role.ENUMERATOR
                    ? actor.getId().equals(s.getEnumeratorId())
                    : REVIEW_ROLES.contains(role);
            case OPEN_REVIEW, RETURN, APPROVE, REJECT -> REVIEW_ROLES.contains(role);
            case PUBLISH -> PUBLISH_ROLES.contains(role);
        };
        if (!ok) {
            throw new AccessDeniedException("Role " + role + " cannot " + action);
        }
    }

    /** BR-RT-2: block the transition while a required, relevant field is empty/invalid. */
    private void revalidate(Submission s) {
        List<FormService.FieldError> errors = forms.validate(s.getAnswers());
        if (!errors.isEmpty()) {
            FormService.FieldError first = errors.get(0);
            throw new ValidationException(
                    first.messagePt() + (errors.size() > 1 ? " (+" + (errors.size() - 1) + ")" : ""));
        }
    }

    /** Mirror routing/registry keys from the answer map into typed columns. */
    private void applyDerivedKeys(Submission s) {
        Map<String, Object> a = s.getAnswers();
        s.setConsent(eqCode(a.get("q0_12"), 1));
        s.setActorType(asInt(a.get("q0_13")));
        s.setInterviewResult(asInt(a.get("q0_15")));
        s.setInterviewDate(asDate(a.get("q0_02")));
        s.setActorName(asStr(a.get("qA_01")));
        s.setAcronym(asStr(a.get("qA_02")));
        s.setOperationLevel(asInt(a.get("qA_17")));
        s.setLegalStatus(asInt(a.get("qA_19")));
        s.setNuit(asStr(a.get("qA_21")));
        s.setContactSharingConsent(eqCode(a.get("qA_23"), 1));

        Object gps = a.get("q0_10");
        if (gps instanceof Map<?, ?> g) {
            s.setLatitude(asDouble(g.get("lat")));
            s.setLongitude(asDouble(g.get("lon")));
            s.setGpsAccuracyM(asDouble(g.get("accuracy")));
            s.setGpsAltitudeM(asDouble(g.get("altitude")));
        }
    }

    private AppUser currentUser(Authentication auth) {
        return users.findByEmailIgnoreCase(auth.getName())
                .orElseThrow(() -> new AccessDeniedException("Unknown user"));
    }

    private Submission require(UUID id) {
        return repo.findById(id).orElseThrow(() -> new NotFoundException("Submission not found"));
    }

    private static Boolean eqCode(Object v, int code) {
        Integer i = asInt(v);
        return i == null ? null : i == code;
    }

    private static Integer asInt(Object v) {
        if (v instanceof Number n) {
            return n.intValue();
        }
        if (v instanceof String s && !s.isBlank()) {
            try {
                return Integer.parseInt(s.trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private static Double asDouble(Object v) {
        if (v instanceof Number n) {
            return n.doubleValue();
        }
        if (v instanceof String s && !s.isBlank()) {
            try {
                return Double.parseDouble(s.trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private static String asStr(Object v) {
        return v == null ? null : v.toString();
    }

    private static LocalDate asDate(Object v) {
        if (v instanceof String s && !s.isBlank()) {
            try {
                return LocalDate.parse(s.trim());
            } catch (RuntimeException ignored) {
                return null;
            }
        }
        return null;
    }

    private static SubmissionDto toDto(Submission s, long qcFlagCount) {
        return new SubmissionDto(
                s.getId().toString(),
                s.getQuestionnaireNumber(),
                s.getClientUuid() != null ? s.getClientUuid().toString() : null,
                s.getStatus().name(),
                s.getActorId() != null ? s.getActorId().toString() : null,
                s.getRoundId() != null ? s.getRoundId().toString() : null,
                s.getFormVersion(),
                s.getEnumeratorId() != null ? s.getEnumeratorId().toString() : null,
                s.getSupervisorId() != null ? s.getSupervisorId().toString() : null,
                s.getDistrictCode(),
                s.getActorType(),
                s.getActorName(),
                s.getConsent(),
                s.getAnswers(),
                s.getSubmittedAt(),
                s.getReviewedAt(),
                s.getPublishedAt(),
                s.getSyncStatus().name(),
                qcFlagCount,
                s.getVersion() == null ? 0 : s.getVersion(),
                s.getCreatedAt(),
                s.getUpdatedAt());
    }
}
