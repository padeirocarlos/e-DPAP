package mz.gov.dpap.service;

import java.util.List;
import java.util.UUID;
import mz.gov.dpap.domain.AppUser;
import mz.gov.dpap.domain.AuditAction;
import mz.gov.dpap.dto.UserAdminDto;
import mz.gov.dpap.dto.UserCreateRequest;
import mz.gov.dpap.dto.UserUpdateRequest;
import mz.gov.dpap.repository.AppUserRepository;
import mz.gov.dpap.service.exception.ConflictException;
import mz.gov.dpap.service.exception.NotFoundException;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private static final String ENTITY = "USER";

    private final AppUserRepository repo;
    private final PasswordEncoder encoder;
    private final AuditService audit;

    public UserService(AppUserRepository repo, PasswordEncoder encoder, AuditService audit) {
        this.repo = repo;
        this.encoder = encoder;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<UserAdminDto> list() {
        return repo.findAll(Sort.by("name")).stream().map(UserService::toDto).toList();
    }

    @Transactional(readOnly = true)
    public UserAdminDto get(UUID id) {
        return toDto(find(id));
    }

    @Transactional
    public UserAdminDto create(UserCreateRequest req, String actorEmail) {
        String email = req.email().trim().toLowerCase();
        if (repo.findByEmailIgnoreCase(email).isPresent()) {
            throw new ConflictException("Email already in use");
        }
        AppUser user = new AppUser();
        user.setName(req.name().trim());
        user.setEmail(email);
        user.setRole(req.role());
        user.setEnabled(true);
        user.setPasswordHash(encoder.encode(req.password()));
        AppUser saved = repo.saveAndFlush(user);
        audit.record(AuditAction.CREATE, ENTITY, saved.getId().toString(), saved.getEmail(), actorEmail);
        return toDto(saved);
    }

    @Transactional
    public UserAdminDto update(UUID id, UserUpdateRequest req, String actorEmail) {
        AppUser user = find(id);
        user.setName(req.name().trim());
        user.setRole(req.role());
        user.setEnabled(req.enabled());
        if (req.password() != null && !req.password().isBlank()) {
            user.setPasswordHash(encoder.encode(req.password()));
        }
        AppUser saved = repo.saveAndFlush(user);
        audit.record(AuditAction.UPDATE, ENTITY, saved.getId().toString(), saved.getEmail(), actorEmail);
        return toDto(saved);
    }

    @Transactional
    public void delete(UUID id, String actorEmail) {
        AppUser user = find(id);
        if (user.getEmail().equalsIgnoreCase(actorEmail)) {
            throw new ConflictException("You cannot delete your own account");
        }
        repo.delete(user);
        audit.record(AuditAction.DELETE, ENTITY, id.toString(), user.getEmail(), actorEmail);
    }

    private AppUser find(UUID id) {
        return repo.findById(id).orElseThrow(() -> new NotFoundException("User not found"));
    }

    private static UserAdminDto toDto(AppUser u) {
        return new UserAdminDto(
                u.getId().toString(), u.getName(), u.getEmail(), u.getRole(),
                u.isEnabled(), u.getCreatedAt());
    }
}
