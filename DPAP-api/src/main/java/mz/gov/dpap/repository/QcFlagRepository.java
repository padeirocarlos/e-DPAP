package mz.gov.dpap.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import mz.gov.dpap.domain.QcFlag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface QcFlagRepository extends JpaRepository<QcFlag, UUID> {
    List<QcFlag> findBySubmissionIdOrderByCreatedAtAsc(UUID submissionId);

    long countBySubmissionId(UUID submissionId);

    /** Flag counts for a batch of submissions (queue listing — avoids N+1). */
    @Query("select f.submissionId, count(f) from QcFlag f where f.submissionId in :ids group by f.submissionId")
    List<Object[]> countBySubmissionIdIn(@Param("ids") Collection<UUID> ids);

    void deleteBySubmissionId(UUID submissionId);
}
