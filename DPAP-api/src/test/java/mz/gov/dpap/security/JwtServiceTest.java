package mz.gov.dpap.security;

import static org.assertj.core.api.Assertions.assertThat;

import io.jsonwebtoken.Claims;
import java.util.UUID;
import mz.gov.dpap.domain.AppUser;
import mz.gov.dpap.domain.Role;
import org.junit.jupiter.api.Test;

class JwtServiceTest {

    private final JwtService jwt =
            new JwtService("test-secret-that-is-at-least-32-bytes-long-123", 3600);

    @Test
    void generateThenParse_roundTripsClaims() {
        AppUser user = new AppUser();
        user.setId(UUID.randomUUID());
        user.setEmail("admin@dpap.gov.mz");
        user.setName("Admin");
        user.setRole(Role.SYS_ADMIN);

        String token = jwt.generate(user);
        Claims claims = jwt.parse(token);

        assertThat(claims.getSubject()).isEqualTo("admin@dpap.gov.mz");
        assertThat(claims.get("role", String.class)).isEqualTo("SYS_ADMIN");
        assertThat(claims.get("name", String.class)).isEqualTo("Admin");
        assertThat(claims.getExpiration()).isAfter(claims.getIssuedAt());
    }
}
