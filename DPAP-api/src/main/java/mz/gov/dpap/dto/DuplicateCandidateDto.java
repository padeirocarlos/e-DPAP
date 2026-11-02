package mz.gov.dpap.dto;

/** A possible existing actor match for a submission (BRD FR-REG-4 merge support). */
public record DuplicateCandidateDto(
        String id,
        String actorUid,
        String name,
        String districtCode,
        String phone,
        String nuit,
        String reason) {
}
