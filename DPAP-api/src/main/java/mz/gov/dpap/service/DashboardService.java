package mz.gov.dpap.service;

import java.time.Instant;
import java.util.List;
import mz.gov.dpap.domain.SyncStatus;
import mz.gov.dpap.dto.DashboardStatsDto;
import mz.gov.dpap.dto.DashboardStatsDto.CountByCode;
import mz.gov.dpap.dto.DashboardStatsDto.SyncInfo;
import mz.gov.dpap.dto.DashboardStatsDto.TrendPoint;
import mz.gov.dpap.repository.ActorRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardService {

    private final ActorRepository repo;

    public DashboardService(ActorRepository repo) {
        this.repo = repo;
    }

    @Transactional(readOnly = true)
    public DashboardStatsDto stats() {
        long total = repo.count();

        List<CountByCode> byDistrict = toCounts(repo.countByDistrict());
        List<CountByCode> bySector = toCounts(repo.countBySector());
        List<CountByCode> byType = toCounts(repo.countByActorType());

        List<TrendPoint> trend = repo.registrationTrend().stream()
                .map(row -> new TrendPoint(String.valueOf(row[0]), ((Number) row[1]).longValue()))
                .toList();

        SyncInfo sync = new SyncInfo(
                repo.countBySyncStatus(SyncStatus.PENDING),
                repo.countBySyncStatus(SyncStatus.CONFLICT),
                Instant.now());

        return new DashboardStatsDto(total, byDistrict, bySector, byType, trend, repo.completeness(), sync);
    }

    private static List<CountByCode> toCounts(List<Object[]> rows) {
        return rows.stream()
                .map(row -> new CountByCode(codeOf(row[0]), ((Number) row[1]).longValue()))
                .sorted((a, b) -> Long.compare(b.count(), a.count()))
                .toList();
    }

    private static String codeOf(Object value) {
        return value instanceof Enum<?> e ? e.name() : String.valueOf(value);
    }
}
