package mz.gov.dpap.service;

import java.util.ArrayList;
import java.util.List;
import mz.gov.dpap.domain.AuditAction;
import mz.gov.dpap.domain.AuditLog;
import mz.gov.dpap.dto.AuditLogDto;
import mz.gov.dpap.dto.PageResponse;
import mz.gov.dpap.repository.AuditLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditService {

    private final AuditLogRepository repo;

    public AuditService(AuditLogRepository repo) {
        this.repo = repo;
    }

    /** Record a data-mutating action. Joins the caller's transaction. */
    @Transactional
    public void record(AuditAction action, String entityType, String entityId,
                       String summary, String actorEmail) {
        AuditLog log = new AuditLog();
        log.setAction(action);
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setSummary(truncate(summary, 240));
        log.setActorEmail(actorEmail == null ? "system" : actorEmail);
        repo.save(log);
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditLogDto> list(
            String entityType, AuditAction action, Integer page, Integer pageSize) {
        int p = page == null || page < 1 ? 1 : page;
        int size = pageSize == null || pageSize < 1 ? 25 : Math.min(pageSize, 200);

        Specification<AuditLog> spec = (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
            if (entityType != null && !entityType.isBlank()) {
                predicates.add(cb.equal(root.get("entityType"), entityType));
            }
            if (action != null) {
                predicates.add(cb.equal(root.get("action"), action));
            }
            return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };

        Page<AuditLog> result = repo.findAll(spec,
                PageRequest.of(p - 1, size, Sort.by(Sort.Direction.DESC, "at")));
        List<AuditLogDto> items = result.getContent().stream().map(AuditService::toDto).toList();
        return new PageResponse<>(items, p, size, result.getTotalElements());
    }

    private static AuditLogDto toDto(AuditLog l) {
        return new AuditLogDto(l.getId().toString(), l.getAt(), l.getActorEmail(),
                l.getAction(), l.getEntityType(), l.getEntityId(), l.getSummary());
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
