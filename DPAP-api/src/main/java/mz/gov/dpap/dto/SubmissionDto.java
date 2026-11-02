package mz.gov.dpap.dto;

import java.time.Instant;
import java.util.Map;

/** Submission representation returned by the API. */
public record SubmissionDto(
        String id,
        Long questionnaireNumber,
        String clientUuid,
        String status,
        String actorId,
        String roundId,
        String formVersion,
        String enumeratorId,
        String supervisorId,
        String districtCode,
        Integer actorType,
        String actorName,
        Boolean consent,
        Map<String, Object> answers,
        Instant submittedAt,
        Instant reviewedAt,
        Instant publishedAt,
        String syncStatus,
        long qcFlagCount,
        long version,
        Instant createdAt,
        Instant updatedAt) {
}
