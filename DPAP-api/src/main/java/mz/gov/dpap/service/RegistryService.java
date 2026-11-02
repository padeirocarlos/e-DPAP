package mz.gov.dpap.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import mz.gov.dpap.domain.Actor;
import mz.gov.dpap.domain.ActorType;
import mz.gov.dpap.domain.AuditAction;
import mz.gov.dpap.domain.LegalStatus;
import mz.gov.dpap.domain.RegistryStatus;
import mz.gov.dpap.domain.Sector;
import mz.gov.dpap.domain.Submission;
import mz.gov.dpap.domain.SyncStatus;
import mz.gov.dpap.dto.DuplicateCandidateDto;
import mz.gov.dpap.repository.ActorRepository;
import mz.gov.dpap.repository.SubmissionRepository;
import mz.gov.dpap.service.exception.ConflictException;
import mz.gov.dpap.service.exception.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Actor Registry (BRD FR-REG, BR-RG): publishing a submission to the master
 * actor record (assigning a permanent {@code actor_uid}), duplicate candidate
 * search and merge (keeping a redirect + audit).
 */
@Service
public class RegistryService {

    /** q0_06 / q0_13 codes → the existing DB codes/enums. */
    private static final Map<Integer, String> DISTRICT_BY_CODE = Map.of(
            1, "BOA", 2, "MAG", 3, "MAN", 4, "MAR", 5, "MTL", 6, "MAT", 7, "MOA", 8, "NAM");

    private final ActorRepository actors;
    private final SubmissionRepository submissions;
    private final AuditService audit;

    public RegistryService(ActorRepository actors, SubmissionRepository submissions, AuditService audit) {
        this.actors = actors;
        this.submissions = submissions;
        this.audit = audit;
    }

    /** Create or update the master actor from an approved submission (BR-RG-1/3). */
    @Transactional
    public Actor publishFromSubmission(Submission s) {
        Map<String, Object> a = s.getAnswers();
        if (s.getLatitude() == null || s.getLongitude() == null) {
            throw new ConflictException("Não é possível publicar sem coordenadas GPS.");
        }
        String districtCode = resolveDistrict(s);
        if (districtCode == null) {
            throw new ConflictException("Distrito em falta ou inválido.");
        }

        Actor actor = s.getActorId() != null
                ? actors.findById(s.getActorId()).orElseGet(Actor::new)
                : new Actor();
        boolean isNew = actor.getId() == null;

        actor.setName(str(a.get("qA_01"), "Actor " + s.getQuestionnaireNumber()));
        actor.setActorType(mapActorType(asInt(a.get("q0_13"))));
        actor.setLegalStatus(mapLegalStatus(asInt(a.get("q0_13")), asInt(a.get("qA_19"))));
        actor.setSector(mapSector(a.get("qA_15")));
        actor.setDistrictCode(districtCode);
        actor.setAdministrativePostCode(null); // free text in 0.07 — not an FK
        actor.setLatitude(s.getLatitude());
        actor.setLongitude(s.getLongitude());
        actor.setResponsiblePerson(str(a.get("qA_03"), null));
        actor.setPhone(str(a.get("qA_09"), null));
        actor.setEmail(str(a.get("qA_11"), null));
        actor.setAddress(str(a.get("qA_12"), null));
        actor.setNuit(str(a.get("qA_21"), null));
        actor.setRegistryStatus(RegistryStatus.ACTIVE);
        actor.setSyncStatus(SyncStatus.SYNCED);
        actor.setUpdatedBy(s.getUpdatedBy());
        if (isNew) {
            actor.setCreatedBy(s.getUpdatedBy());
        }

        Actor saved = actors.saveAndFlush(actor);
        if (saved.getActorUid() == null) {
            saved.setActorUid(String.format("MPT-%s-%06d", districtCode, s.getQuestionnaireNumber()));
            saved = actors.saveAndFlush(saved);
        }
        audit.record(isNew ? AuditAction.CREATE : AuditAction.UPDATE, "ACTOR",
                saved.getId().toString(), "Publicado do questionário " + s.getQuestionnaireNumber(),
                s.getUpdatedBy());
        return saved;
    }

    /** Candidate existing actors that may be the same real-world actor (FR-REG-4). */
    @Transactional(readOnly = true)
    public List<DuplicateCandidateDto> duplicateCandidates(UUID submissionId) {
        Submission s = submissions.findById(submissionId)
                .orElseThrow(() -> new NotFoundException("Submission not found"));
        Map<String, Object> a = s.getAnswers();
        String phone = str(a.get("qA_09"), null);
        String nuit = str(a.get("qA_21"), null);
        String name = str(a.get("qA_01"), null);

        Map<UUID, DuplicateCandidateDto> found = new LinkedHashMap<>();
        if (phone != null) {
            actors.findByPhone(phone).forEach(x -> found.put(x.getId(), toCandidate(x, "Mesmo telefone")));
        }
        if (nuit != null) {
            actors.findByNuit(nuit).forEach(x -> found.putIfAbsent(x.getId(), toCandidate(x, "Mesmo NUIT")));
        }
        if (name != null) {
            actors.findTop10ByNameContainingIgnoreCase(name)
                    .forEach(x -> found.putIfAbsent(x.getId(), toCandidate(x, "Nome semelhante")));
        }
        return new ArrayList<>(found.values());
    }

    /** Merge {@code sourceId} into {@code targetId}: redirect + audit (BR-RG-2). */
    @Transactional
    public Actor merge(UUID sourceId, UUID targetId, String actorEmail) {
        if (sourceId.equals(targetId)) {
            throw new ConflictException("Não é possível fundir um actor consigo próprio.");
        }
        Actor source = actors.findById(sourceId)
                .orElseThrow(() -> new NotFoundException("Source actor not found"));
        Actor target = actors.findById(targetId)
                .orElseThrow(() -> new NotFoundException("Target actor not found"));
        if (source.getRegistryStatus() == RegistryStatus.MERGED) {
            throw new ConflictException("O actor de origem já foi fundido.");
        }
        source.setRegistryStatus(RegistryStatus.MERGED);
        source.setMergedIntoId(target.getId());
        actors.saveAndFlush(source);
        // Re-point this source's published submissions at the surviving actor.
        submissions.findAll().stream()
                .filter(x -> sourceId.equals(x.getActorId()))
                .forEach(x -> {
                    x.setActorId(target.getId());
                    submissions.save(x);
                });
        audit.record(AuditAction.UPDATE, "ACTOR", target.getId().toString(),
                "Fusão de " + (source.getActorUid() != null ? source.getActorUid() : sourceId), actorEmail);
        return target;
    }

    // --- mapping helpers ----------------------------------------------------

    private String resolveDistrict(Submission s) {
        String code = s.getDistrictCode();
        if (code != null && code.matches("[A-Z]{3}")) {
            return code;
        }
        Integer c = asInt(s.getAnswers().get("q0_06"));
        return c != null ? DISTRICT_BY_CODE.get(c) : null;
    }

    private static ActorType mapActorType(Integer code) {
        if (code == null) {
            return ActorType.PRODUCER;
        }
        return switch (code) {
            case 2 -> ActorType.PRODUCER_ASSOCIATION;
            case 3 -> ActorType.NGO;
            case 4 -> ActorType.PRIVATE_COMPANY;
            case 5 -> ActorType.PUBLIC_INSTITUTION;
            default -> ActorType.PRODUCER;
        };
    }

    private static LegalStatus mapLegalStatus(Integer typeCode, Integer legalCode) {
        if (legalCode != null && legalCode == 3) {
            return LegalStatus.INFORMAL;
        }
        if (typeCode == null) {
            return LegalStatus.INDIVIDUAL;
        }
        return switch (typeCode) {
            case 2 -> LegalStatus.ASSOCIATION;
            case 3 -> LegalStatus.NGO;
            case 4 -> LegalStatus.COMPANY;
            case 5 -> LegalStatus.PUBLIC;
            default -> LegalStatus.INDIVIDUAL;
        };
    }

    private static Sector mapSector(Object subsectors) {
        Integer first = null;
        if (subsectors instanceof List<?> list && !list.isEmpty()) {
            first = asInt(list.get(0));
        } else {
            first = asInt(subsectors);
        }
        if (first == null) {
            return Sector.AGRICULTURE;
        }
        return switch (first) {
            case 2 -> Sector.LIVESTOCK;
            case 3 -> Sector.FISHERIES;
            case 4 -> Sector.AQUACULTURE;
            default -> Sector.AGRICULTURE;
        };
    }

    private static DuplicateCandidateDto toCandidate(Actor x, String reason) {
        return new DuplicateCandidateDto(
                x.getId().toString(), x.getActorUid(), x.getName(), x.getDistrictCode(),
                x.getPhone(), x.getNuit(), reason);
    }

    private static Integer asInt(Object v) {
        if (v instanceof Number n) {
            return n.intValue();
        }
        if (v instanceof String str && !str.isBlank()) {
            try {
                return (int) Double.parseDouble(str.trim());
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    private static String str(Object v, String fallback) {
        if (v == null) {
            return fallback;
        }
        String s = v.toString().trim();
        return s.isEmpty() ? fallback : s;
    }
}
