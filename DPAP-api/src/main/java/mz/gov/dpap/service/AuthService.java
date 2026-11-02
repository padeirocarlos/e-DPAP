package mz.gov.dpap.service;

import mz.gov.dpap.domain.AppUser;
import mz.gov.dpap.dto.LoginRequest;
import mz.gov.dpap.dto.LoginResponse;
import mz.gov.dpap.dto.UserDto;
import mz.gov.dpap.repository.AppUserRepository;
import mz.gov.dpap.security.JwtService;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final AppUserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public AuthService(AppUserRepository users, PasswordEncoder encoder, JwtService jwt) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest req) {
        AppUser user = users.findByEmailIgnoreCase(req.email().trim())
                .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

        if (!user.isEnabled() || !encoder.matches(req.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid credentials");
        }

        String token = jwt.generate(user);
        UserDto dto = new UserDto(
                user.getId().toString(), user.getName(), user.getEmail(), user.getRole().name());
        return new LoginResponse(token, dto);
    }
}
