package mz.gov.dpap.dto;

import java.time.Instant;
import mz.gov.dpap.domain.ActorType;
import mz.gov.dpap.domain.Sector;

public record ActorSummaryDto(
        String id,
        String name,
        ActorType actorType,
        Sector sector,
        String districtCode,
        double latitude,
        double longitude,
        Instant updatedAt) {}
