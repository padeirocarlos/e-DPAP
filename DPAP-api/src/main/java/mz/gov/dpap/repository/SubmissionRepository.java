package mz.gov.dpap.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import mz.gov.dpap.domain.Submission;
import mz.gov.dpap.domain.SubmissionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface SubmissionRepository
        extends JpaRepository<Submission, UUID>, JpaSpecificationExecutor<Submission> {
    Optional<Submission> findByClientUuid(UUID clientUuid);

    List<Submission> findByStatus(SubmissionStatus status);
}
