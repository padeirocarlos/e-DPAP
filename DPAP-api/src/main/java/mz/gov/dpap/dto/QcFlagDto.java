package mz.gov.dpap.dto;

/** A QC flag as returned by the API (BRD FR-QC-1). */
public record QcFlagDto(String id, String ruleId, String severity, String message, boolean resolved) {}
