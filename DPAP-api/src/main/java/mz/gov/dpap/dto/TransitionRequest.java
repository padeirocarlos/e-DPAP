package mz.gov.dpap.dto;

import jakarta.validation.constraints.NotNull;
import mz.gov.dpap.domain.SubmissionAction;

/**
 * A workflow transition request (BRD §4.2). {@code reason} is mandatory for
 * RETURN and REJECT (FR-QC-3). {@code version} guards against concurrent edits.
 */
public record TransitionRequest(
        @NotNull SubmissionAction action,
        String reason,
        Long version) {
}
