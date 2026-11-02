package mz.gov.dpap.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import mz.gov.dpap.domain.Actor;
import mz.gov.dpap.domain.ActorType;
import mz.gov.dpap.domain.SyncStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface ActorRepository
        extends JpaRepository<Actor, UUID>, JpaSpecificationExecutor<Actor> {

    // --- Duplicate detection (natural key) ---
    Optional<Actor> findFirstByRegistrationNumberIgnoreCase(String registrationNumber);

    Optional<Actor> findFirstByNameIgnoreCaseAndDistrictCodeAndActorType(
            String name, String districtCode, ActorType actorType);

    // --- Fuzzy duplicate candidates (QC + merge, BR-QC-4 / FR-REG-4) ---
    List<Actor> findByPhone(String phone);

    List<Actor> findByNuit(String nuit);

    List<Actor> findTop10ByNameContainingIgnoreCase(String fragment);

    Optional<Actor> findFirstByActorUid(String actorUid);

    // --- Dashboard aggregates (each row: [code, count]) ---
    @Query("select a.districtCode, count(a) from Actor a group by a.districtCode")
    List<Object[]> countByDistrict();

    @Query("select a.sector, count(a) from Actor a group by a.sector")
    List<Object[]> countBySector();

    @Query("select a.actorType, count(a) from Actor a group by a.actorType")
    List<Object[]> countByActorType();

    @Query(value = """
            select to_char(created_at, 'YYYY-MM') as period, count(*) as total
            from actor
            group by period
            order by period
            """, nativeQuery = true)
    List<Object[]> registrationTrend();

    @Query(value = """
            select coalesce(avg(case
                when registration_number is not null
                 and responsible_person is not null
                 and phone is not null
                 and email is not null then 1.0 else 0.0 end), 0.0)
            from actor
            """, nativeQuery = true)
    double completeness();

    long countBySyncStatus(SyncStatus status);
}
