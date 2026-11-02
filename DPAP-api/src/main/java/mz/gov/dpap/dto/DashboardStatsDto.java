package mz.gov.dpap.dto;

import java.time.Instant;
import java.util.List;

public record DashboardStatsDto(
        long totalActors,
        List<CountByCode> byDistrict,
        List<CountByCode> bySector,
        List<CountByCode> byType,
        List<TrendPoint> registrationTrend,
        double completeness,
        SyncInfo sync) {

    public record CountByCode(String code, long count) {}

    public record TrendPoint(String period, long count) {}

    public record SyncInfo(long pending, long conflicts, Instant lastSyncAt) {}
}
