package mz.gov.dpap.dto;

import java.time.Instant;
import mz.gov.dpap.domain.AuditAction;

public record AuditLogDto(
        String id,
        Instant at,
        String actorEmail,
        AuditAction action,
        String entityType,
        String entityId,
        String summary) {}
