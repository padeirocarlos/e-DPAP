package mz.gov.dpap.repository;

import java.util.UUID;
import mz.gov.dpap.domain.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AuditLogRepository
        extends JpaRepository<AuditLog, UUID>, JpaSpecificationExecutor<AuditLog> {
}
