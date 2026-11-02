package mz.gov.dpap.dto;

import jakarta.validation.constraints.NotBlank;

/** Add a review comment to a submission, optionally pinned to a field. */
public record CommentRequest(String field, @NotBlank String comment) {}
