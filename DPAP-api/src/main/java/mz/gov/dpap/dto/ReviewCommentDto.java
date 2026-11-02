package mz.gov.dpap.dto;

import java.time.Instant;

/** A reviewer comment (BRD FR-QC-3/4). */
public record ReviewCommentDto(
        String id, String field, String comment, String author, String status, Instant createdAt) {}
