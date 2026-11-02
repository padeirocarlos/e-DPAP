package mz.gov.dpap.repository;

import java.util.List;
import java.util.UUID;
import mz.gov.dpap.domain.ReviewComment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewCommentRepository extends JpaRepository<ReviewComment, UUID> {
    List<ReviewComment> findBySubmissionIdOrderByCreatedAtAsc(UUID submissionId);
}
