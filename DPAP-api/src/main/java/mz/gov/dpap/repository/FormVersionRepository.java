package mz.gov.dpap.repository;

import java.util.Optional;
import java.util.UUID;
import mz.gov.dpap.domain.FormVersion;
import mz.gov.dpap.domain.FormVersionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FormVersionRepository extends JpaRepository<FormVersion, UUID> {
    Optional<FormVersion> findByVersion(String version);

    Optional<FormVersion> findFirstByStatusOrderByPublishedAtDesc(FormVersionStatus status);
}
