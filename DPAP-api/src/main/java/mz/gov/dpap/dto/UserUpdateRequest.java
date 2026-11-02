package mz.gov.dpap.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import mz.gov.dpap.domain.Role;

/** Email is immutable; `password` is optional (set only to reset it). */
public record UserUpdateRequest(
        @NotBlank @Size(max = 160) String name,
        @NotNull Role role,
        @NotNull Boolean enabled,
        @Size(min = 8, max = 72) String password) {}
