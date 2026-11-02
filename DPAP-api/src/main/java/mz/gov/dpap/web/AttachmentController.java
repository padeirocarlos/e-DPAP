package mz.gov.dpap.web;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import mz.gov.dpap.domain.Attachment;
import mz.gov.dpap.dto.AttachmentDto;
import mz.gov.dpap.dto.AttachmentRequest;
import mz.gov.dpap.service.AttachmentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** Submission attachment upload / listing / download (BRD FR-MOB-5). */
@RestController
public class AttachmentController {

    private final AttachmentService attachments;

    public AttachmentController(AttachmentService attachments) {
        this.attachments = attachments;
    }

    @PostMapping("/submissions/{id}/attachments")
    public ResponseEntity<AttachmentDto> upload(
            @PathVariable UUID id, @Valid @RequestBody AttachmentRequest request) {
        Attachment a = attachments.store(id, request.field(), request.dataUrl(), request.mime());
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(a));
    }

    @GetMapping("/submissions/{id}/attachments")
    public List<AttachmentDto> list(@PathVariable UUID id) {
        return attachments.list(id).stream().map(AttachmentController::toDto).toList();
    }

    @GetMapping("/attachments/{id}")
    public ResponseEntity<byte[]> download(@PathVariable UUID id) {
        AttachmentService.StoredFile f = attachments.read(id);
        MediaType type = f.mime() != null ? MediaType.parseMediaType(f.mime()) : MediaType.APPLICATION_OCTET_STREAM;
        return ResponseEntity.ok().contentType(type).body(f.bytes());
    }

    private static AttachmentDto toDto(Attachment a) {
        return new AttachmentDto(a.getId().toString(), a.getField(), a.getMime(), a.getSizeBytes(),
                "/attachments/" + a.getId());
    }
}
