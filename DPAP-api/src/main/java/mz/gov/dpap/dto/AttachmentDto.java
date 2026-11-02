package mz.gov.dpap.dto;

/** An attachment's metadata (the bytes are fetched from {@code url}). */
public record AttachmentDto(String id, String field, String mime, Long sizeBytes, String url) {}
