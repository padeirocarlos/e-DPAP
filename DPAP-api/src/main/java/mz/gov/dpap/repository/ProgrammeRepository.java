package mz.gov.dpap.repository;

import java.util.List;
import java.util.UUID;
import mz.gov.dpap.domain.Programme;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProgrammeRepository extends JpaRepository<Programme, UUID> {
    List<Programme> findBySubmissionId(UUID submissionId);

    void deleteBySubmissionId(UUID submissionId);
}
