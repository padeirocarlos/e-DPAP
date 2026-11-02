package mz.gov.dpap.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/** Merge the current actor into {@code into} (BRD BR-RG-2). */
public record MergeRequest(@NotNull UUID into) {}
