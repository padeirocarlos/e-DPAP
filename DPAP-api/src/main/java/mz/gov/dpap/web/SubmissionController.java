package mz.gov.dpap.web;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import mz.gov.dpap.domain.SubmissionStatus;
import mz.gov.dpap.dto.CommentRequest;
import mz.gov.dpap.dto.DuplicateCandidateDto;
import mz.gov.dpap.dto.PageResponse;
import mz.gov.dpap.dto.QcFlagDto;
import mz.gov.dpap.dto.ReviewCommentDto;
import mz.gov.dpap.dto.SubmissionDto;
import mz.gov.dpap.dto.SubmissionRequest;
import mz.gov.dpap.dto.TransitionRequest;
import mz.gov.dpap.service.RegistryService;
import mz.gov.dpap.service.SubmissionService;
import mz.gov.dpap.service.SubmissionService.SubmissionFilters;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/submissions")
public class SubmissionController {

    private final SubmissionService submissions;
    private final RegistryService registry;

    public SubmissionController(SubmissionService submissions, RegistryService registry) {
        this.submissions = submissions;
        this.registry = registry;
    }

    @GetMapping
    public PageResponse<SubmissionDto> list(
            @RequestParam(required = false) SubmissionStatus status,
            @RequestParam(required = false) String districtCode,
            @RequestParam(required = false) Integer actorType,
            @RequestParam(required = false, defaultValue = "false") boolean mine,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize,
            Authentication auth) {
        return submissions.list(
                new SubmissionFilters(status, districtCode, actorType, mine, page, pageSize), auth);
    }

    @GetMapping("/{id}")
    public SubmissionDto get(@PathVariable UUID id) {
        return submissions.get(id);
    }

    @PostMapping
    public ResponseEntity<SubmissionDto> create(
            @Valid @RequestBody SubmissionRequest request, Authentication auth) {
        SubmissionDto created = submissions.create(request, auth);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/{id}/transitions")
    public SubmissionDto transition(
            @PathVariable UUID id, @Valid @RequestBody TransitionRequest request, Authentication auth) {
        return submissions.transition(id, request, auth);
    }

    @GetMapping("/{id}/qc")
    public List<QcFlagDto> qcFlags(@PathVariable UUID id) {
        return submissions.qcFlags(id);
    }

    @GetMapping("/{id}/comments")
    public List<ReviewCommentDto> comments(@PathVariable UUID id) {
        return submissions.comments(id);
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<ReviewCommentDto> addComment(
            @PathVariable UUID id, @Valid @RequestBody CommentRequest request, Authentication auth) {
        ReviewCommentDto created = submissions.addComment(id, request.field(), request.comment(), auth);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/{id}/duplicates")
    public List<DuplicateCandidateDto> duplicates(@PathVariable UUID id) {
        return registry.duplicateCandidates(id);
    }
}
