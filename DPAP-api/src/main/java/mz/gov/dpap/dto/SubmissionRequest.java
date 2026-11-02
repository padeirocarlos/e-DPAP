package mz.gov.dpap.dto;

import jakarta.validation.constraints.NotNull;
import java.util.Map;
import java.util.UUID;

/**
 * Create/update a submission. {@code answers} is the full questionnaire answer
 * map (every qX_YY variable); routing/registry keys are mirrored into typed
 * columns server-side. {@code submit=true} advances the new submission straight
 * to SUBMITTED (runs server-side re-validation, BR-RT-2); otherwise it is a DRAFT.
 */
public record SubmissionRequest(
        UUID clientUuid,
        UUID roundId,
        String formVersion,
        String districtCode,
        @NotNull Map<String, Object> answers,
        String deviceId,
        String appVersion,
        boolean submit) {
}
