package mz.gov.dpap.web;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import mz.gov.dpap.dto.UserAdminDto;
import mz.gov.dpap.dto.UserCreateRequest;
import mz.gov.dpap.dto.UserUpdateRequest;
import mz.gov.dpap.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/** User administration (administrators only — see SecurityConfig). */
@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService users;

    public UserController(UserService users) {
        this.users = users;
    }

    @GetMapping
    public List<UserAdminDto> list() {
        return users.list();
    }

    @GetMapping("/{id}")
    public UserAdminDto get(@PathVariable UUID id) {
        return users.get(id);
    }

    @PostMapping
    public ResponseEntity<UserAdminDto> create(
            @Valid @RequestBody UserCreateRequest request, Authentication auth) {
        UserAdminDto created = users.create(request, auth.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public UserAdminDto update(
            @PathVariable UUID id, @Valid @RequestBody UserUpdateRequest request, Authentication auth) {
        return users.update(id, request, auth.getName());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id, Authentication auth) {
        users.delete(id, auth.getName());
    }
}
