package mz.gov.dpap.web;

import mz.gov.dpap.domain.AuditAction;
import mz.gov.dpap.dto.AuditLogDto;
import mz.gov.dpap.dto.PageResponse;
import mz.gov.dpap.service.AuditService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Audit trail browsing (administrators only — see SecurityConfig). */
@RestController
@RequestMapping("/audit")
public class AuditController {

    private final AuditService audit;

    public AuditController(AuditService audit) {
        this.audit = audit;
    }

    @GetMapping
    public PageResponse<AuditLogDto> list(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) AuditAction action,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize) {
        return audit.list(entityType, action, page, pageSize);
    }
}
