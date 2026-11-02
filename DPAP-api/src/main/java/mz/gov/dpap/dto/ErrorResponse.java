package mz.gov.dpap.dto;

/** Error body consumed by the frontend: `{ message, code }`. */
public record ErrorResponse(String message, String code) {}
