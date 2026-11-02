package mz.gov.dpap.dto;

import java.time.Instant;
import mz.gov.dpap.domain.Role;

/** User as seen by the administration module. */
public record UserAdminDto(
        String id,
        String name,
        String email,
        Role role,
        boolean enabled,
        Instant createdAt) {}
