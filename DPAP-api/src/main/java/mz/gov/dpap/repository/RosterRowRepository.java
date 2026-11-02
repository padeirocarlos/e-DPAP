package mz.gov.dpap.repository;

import java.util.List;
import java.util.UUID;
import mz.gov.dpap.domain.RosterRow;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RosterRowRepository extends JpaRepository<RosterRow, UUID> {
    List<RosterRow> findBySubmissionIdOrderByRosterIdAscRowIndexAsc(UUID submissionId);

    void deleteBySubmissionId(UUID submissionId);
}
