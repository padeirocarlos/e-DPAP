package mz.gov.dpap.web;

import jakarta.validation.Valid;
import java.util.UUID;
import mz.gov.dpap.domain.ActorType;
import mz.gov.dpap.domain.LegalStatus;
import mz.gov.dpap.domain.Sector;
import mz.gov.dpap.dto.ActorDto;
import mz.gov.dpap.dto.ActorRequest;
import mz.gov.dpap.dto.ActorSummaryDto;
import mz.gov.dpap.dto.MergeRequest;
import mz.gov.dpap.dto.PageResponse;
import mz.gov.dpap.service.ActorService;
import mz.gov.dpap.service.ActorService.ActorFilters;
import mz.gov.dpap.service.RegistryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/actors")
public class ActorController {

    private final ActorService actors;
    private final RegistryService registry;

    public ActorController(ActorService actors, RegistryService registry) {
        this.actors = actors;
        this.registry = registry;
    }

    @GetMapping
    public PageResponse<ActorSummaryDto> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String districtCode,
            @RequestParam(required = false) String localityCode,
            @RequestParam(required = false) Sector sector,
            @RequestParam(required = false) ActorType actorType,
            @RequestParam(required = false) LegalStatus legalStatus,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize) {
        return actors.list(new ActorFilters(
                q, districtCode, localityCode, sector, actorType, legalStatus, page, pageSize));
    }

    /**
     * Delta pull for offline clients: full records changed since a watermark.
     * Must precede the `/{id}` mapping conceptually — Spring matches this literal
     * path first, so `/actors/changes` never hits the UUID handler.
     */
    @GetMapping("/changes")
    public PageResponse<ActorDto> changes(
            @RequestParam(required = false) String since,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize) {
        return actors.changes(since, page, pageSize);
    }

    @GetMapping("/{id}")
    public ActorDto get(@PathVariable UUID id) {
        return actors.get(id);
    }

    @PostMapping
    public ResponseEntity<ActorDto> create(
            @Valid @RequestBody ActorRequest request, Authentication auth) {
        ActorDto created = actors.create(request, auth.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ActorDto update(
            @PathVariable UUID id, @Valid @RequestBody ActorRequest request, Authentication auth) {
        return actors.update(id, request, auth.getName());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id, Authentication auth) {
        actors.delete(id, auth.getName());
    }

    /** Merge this actor into another (BR-RG-2). Returns the surviving actor's id. */
    @PostMapping("/{id}/merge")
    public ResponseEntity<java.util.Map<String, String>> merge(
            @PathVariable UUID id, @Valid @RequestBody MergeRequest request, Authentication auth) {
        var target = registry.merge(id, request.into(), auth.getName());
        return ResponseEntity.ok(java.util.Map.of("id", target.getId().toString()));
    }
}
