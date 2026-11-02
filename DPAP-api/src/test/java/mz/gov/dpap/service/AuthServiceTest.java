package mz.gov.dpap.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;
import mz.gov.dpap.domain.AppUser;
import mz.gov.dpap.domain.Role;
import mz.gov.dpap.dto.LoginRequest;
import mz.gov.dpap.dto.LoginResponse;
import mz.gov.dpap.repository.AppUserRepository;
import mz.gov.dpap.security.JwtService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock AppUserRepository users;
    @Mock PasswordEncoder encoder;
    @Mock JwtService jwt;
    @InjectMocks AuthService service;

    private AppUser user() {
        AppUser u = new AppUser();
        u.setId(UUID.randomUUID());
        u.setName("Admin");
        u.setEmail("admin@dpap.gov.mz");
        u.setPasswordHash("$hash");
        u.setRole(Role.SYS_ADMIN);
        u.setEnabled(true);
        return u;
    }

    @Test
    void login_validCredentials_returnsTokenAndUser() {
        AppUser u = user();
        when(users.findByEmailIgnoreCase("admin@dpap.gov.mz")).thenReturn(Optional.of(u));
        when(encoder.matches("secret", "$hash")).thenReturn(true);
        when(jwt.generate(u)).thenReturn("the-token");

        LoginResponse res = service.login(new LoginRequest("admin@dpap.gov.mz", "secret"));

        assertThat(res.token()).isEqualTo("the-token");
        assertThat(res.user().email()).isEqualTo("admin@dpap.gov.mz");
        assertThat(res.user().role()).isEqualTo("SYS_ADMIN");
    }

    @Test
    void login_wrongPassword_throws() {
        AppUser u = user();
        when(users.findByEmailIgnoreCase("admin@dpap.gov.mz")).thenReturn(Optional.of(u));
        when(encoder.matches("wrong", "$hash")).thenReturn(false);

        assertThatThrownBy(() -> service.login(new LoginRequest("admin@dpap.gov.mz", "wrong")))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void login_unknownEmail_throws() {
        when(users.findByEmailIgnoreCase("nobody@dpap.gov.mz")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.login(new LoginRequest("nobody@dpap.gov.mz", "x")))
                .isInstanceOf(BadCredentialsException.class);
    }
}
