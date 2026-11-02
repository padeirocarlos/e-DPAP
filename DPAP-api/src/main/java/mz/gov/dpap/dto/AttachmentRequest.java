package mz.gov.dpap.dto;

import jakarta.validation.constraints.NotBlank;

/** Upload a submission attachment as a data URL (BRD FR-MOB-5). */
public record AttachmentRequest(String field, @NotBlank String dataUrl, String mime) {}
