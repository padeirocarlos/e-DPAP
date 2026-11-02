package mz.gov.dpap.repository;

import java.util.List;
import java.util.UUID;
import mz.gov.dpap.domain.UserScope;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserScopeRepository extends JpaRepository<UserScope, UserScope.Key> {
    List<UserScope> findByUserId(UUID userId);
}
