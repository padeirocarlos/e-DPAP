package mz.gov.dpap.repository;

import java.util.List;
import java.util.UUID;
import mz.gov.dpap.domain.Relationship;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RelationshipRepository extends JpaRepository<Relationship, UUID> {
    List<Relationship> findBySubmissionId(UUID submissionId);

    void deleteBySubmissionId(UUID submissionId);
}
