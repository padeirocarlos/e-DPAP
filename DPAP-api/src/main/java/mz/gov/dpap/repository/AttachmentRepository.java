package mz.gov.dpap.repository;

import java.util.List;
import java.util.UUID;
import mz.gov.dpap.domain.Attachment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AttachmentRepository extends JpaRepository<Attachment, UUID> {
    List<Attachment> findBySubmissionIdOrderByCreatedAtAsc(UUID submissionId);
}
