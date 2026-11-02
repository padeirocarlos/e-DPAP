package mz.gov.dpap.repository;

import java.util.Optional;
import java.util.UUID;
import mz.gov.dpap.domain.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {
    Optional<AppUser> findByEmailIgnoreCase(String email);
}
