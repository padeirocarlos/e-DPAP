package mz.gov.dpap.service;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import mz.gov.dpap.domain.Actor;
import mz.gov.dpap.domain.ActorType;
import mz.gov.dpap.domain.AuditAction;
import mz.gov.dpap.domain.LegalStatus;
import mz.gov.dpap.domain.Sector;
import mz.gov.dpap.dto.ActorDto;
import mz.gov.dpap.dto.ActorRequest;
import mz.gov.dpap.dto.ActorSummaryDto;
import mz.gov.dpap.dto.PageResponse;
import mz.gov.dpap.repository.ActorRepository;
import mz.gov.dpap.service.exception.DuplicateActorException;
import mz.gov.dpap.service.exception.NotFoundException;
import mz.gov.dpap.service.exception.StaleVersionException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ActorService {

    private static final String ENTITY = "ACTOR";

    private final ActorRepository repo;
    private final AuditService audit;

    public ActorService(ActorRepository repo, AuditService audit) {
        this.repo = repo;
        this.audit = audit;
    }

    public record ActorFilters(
            String q,
            String districtCode,
            String localityCode,
            Sector sector,
            ActorType actorType,
            LegalStatus legalStatus,
            Integer page,
            Integer pageSize) {}

    @Transactional(readOnly = true)
    public PageResponse<ActorSummaryDto> list(ActorFilters f) {
        int page = f.page() == null || f.page() < 1 ? 1 : f.page();
        int pageSize = f.pageSize() == null || f.pageSize() < 1 ? 25 : Math.min(f.pageSize(), 200);

        Page<Actor> result = repo.findAll(
                buildSpec(f),
                PageRequest.of(page - 1, pageSize, Sort.by(Sort.Direction.DESC, "updatedAt")));

        List<ActorSummaryDto> items = result.getContent().stream().map(ActorMapper::toSummary).toList();
        return new PageResponse<>(items, page, pageSize, result.getTotalElements());
    }

    @Transactional(readOnly = true)
    public ActorDto get(UUID id) {
        return ActorMapper.toDto(find(id));
    }

    /**
     * Delta pull for the offline clients: full actor records with
     * {@code updatedAt > since}, oldest change first, paged. The client stores
     * the newest {@code updatedAt} it has seen and passes it back as the next
     * (exclusive) watermark, so each poll transfers only genuine deltas —
     * microsecond timestamps make a boundary collision a non-issue. A
     * null/blank/invalid {@code since} means a full initial pull.
     */
    @Transactional(readOnly = true)
    public PageResponse<ActorDto> changes(String since, Integer page, Integer pageSize) {
        int p = page == null || page < 1 ? 1 : page;
        int size = pageSize == null || pageSize < 1 ? 100 : Math.min(pageSize, 500);

        Instant from;
        try {
            from = (since == null || since.isBlank()) ? Instant.EPOCH : Instant.parse(since);
        } catch (DateTimeParseException e) {
            from = Instant.EPOCH;
        }
        final Instant watermark = from;

        Specification<Actor> spec = (root, query, cb) ->
                cb.greaterThan(root.get("updatedAt"), watermark);

        Page<Actor> result = repo.findAll(spec,
                PageRequest.of(p - 1, size, Sort.by(Sort.Direction.ASC, "updatedAt")));
        List<ActorDto> items = result.getContent().stream().map(ActorMapper::toDto).toList();
        return new PageResponse<>(items, p, size, result.getTotalElements());
    }

    /** Fetch matching actors for export (bounded, ordered by name). */
    @Transactional(readOnly = true)
    public List<Actor> findForExport(ActorFilters f) {
        return repo.findAll(buildSpec(f),
                PageRequest.of(0, 10_000, Sort.by(Sort.Direction.ASC, "name"))).getContent();
    }

    @Transactional
    public ActorDto create(ActorRequest req, String actorEmail) {
        checkDuplicate(req, null);
        Actor actor = new Actor();
        ActorMapper.apply(actor, req);
        actor.setCreatedBy(actorEmail);
        actor.setUpdatedBy(actorEmail);
        // Flush so @CreationTimestamp/@UpdateTimestamp are populated on the
        // returned entity (they are generated during flush, not at save()).
        Actor saved = repo.saveAndFlush(actor);
        audit.record(AuditAction.CREATE, ENTITY, saved.getId().toString(),
                saved.getName(), actorEmail);
        return ActorMapper.toDto(saved);
    }

    @Transactional
    public ActorDto update(UUID id, ActorRequest req, String actorEmail) {
        Actor actor = find(id);
        if (req.version() == null || req.version() != actor.getVersion()) {
            throw new StaleVersionException("Actor was modified by someone else");
        }
        checkDuplicate(req, id);
        ActorMapper.apply(actor, req);
        actor.setUpdatedBy(actorEmail);
        // Flush so the @Version increment and @UpdateTimestamp are reflected in
        // the returned entity (both are applied during flush).
        Actor saved = repo.saveAndFlush(actor);
        audit.record(AuditAction.UPDATE, ENTITY, saved.getId().toString(),
                saved.getName(), actorEmail);
        return ActorMapper.toDto(saved);
    }

    @Transactional
    public void delete(UUID id, String actorEmail) {
        Actor actor = find(id);
        repo.delete(actor);
        audit.record(AuditAction.DELETE, ENTITY, id.toString(), actor.getName(), actorEmail);
    }

    private Actor find(UUID id) {
        return repo.findById(id).orElseThrow(() -> new NotFoundException("Actor not found"));
    }

    /**
     * A registration number, when present, is the authoritative identity;
     * otherwise the natural key is name + district + type (matching the frontend
     * duplicate rule). `excludeId` skips the record being updated.
     */
    private void checkDuplicate(ActorRequest req, UUID excludeId) {
        String reg = trimToNull(req.registrationNumber());
        if (reg != null) {
            repo.findFirstByRegistrationNumberIgnoreCase(reg)
                    .filter(a -> !a.getId().equals(excludeId))
                    .ifPresent(a -> { throw new DuplicateActorException("Duplicate registration number"); });
            return;
        }
        repo.findFirstByNameIgnoreCaseAndDistrictCodeAndActorType(
                        req.name().trim(), req.districtCode(), req.actorType())
                .filter(a -> !a.getId().equals(excludeId))
                .ifPresent(a -> { throw new DuplicateActorException("Duplicate actor"); });
    }

    private Specification<Actor> buildSpec(ActorFilters f) {
        return (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
            if (trimToNull(f.q()) != null) {
                predicates.add(cb.like(cb.lower(root.get("name")),
                        "%" + f.q().trim().toLowerCase() + "%"));
            }
            if (trimToNull(f.districtCode()) != null) {
                predicates.add(cb.equal(root.get("districtCode"), f.districtCode()));
            }
            if (trimToNull(f.localityCode()) != null) {
                predicates.add(cb.equal(root.get("localityCode"), f.localityCode()));
            }
            if (f.sector() != null) predicates.add(cb.equal(root.get("sector"), f.sector()));
            if (f.actorType() != null) predicates.add(cb.equal(root.get("actorType"), f.actorType()));
            if (f.legalStatus() != null) predicates.add(cb.equal(root.get("legalStatus"), f.legalStatus()));
            return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
    }

    private static String trimToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
