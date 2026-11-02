package mz.gov.dpap.service;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import mz.gov.dpap.domain.Attachment;
import mz.gov.dpap.repository.AttachmentRepository;
import mz.gov.dpap.repository.SubmissionRepository;
import mz.gov.dpap.service.exception.NotFoundException;
import mz.gov.dpap.service.exception.ValidationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Stores submission attachments (photos) on the server filesystem (BRD FR-MOB-5).
 * Accepts a data URL (what the clients capture/compress). The storage directory
 * is {@code ATTACHMENTS_DIR} (mount a volume in production).
 */
@Service
public class AttachmentService {

    private static final long MAX_BYTES = 5L * 1024 * 1024;

    private final AttachmentRepository attachments;
    private final SubmissionRepository submissions;
    private final Path baseDir;

    public AttachmentService(AttachmentRepository attachments, SubmissionRepository submissions,
                             @Value("${app.attachments.dir:/tmp/dpap-attachments}") String dir) {
        this.attachments = attachments;
        this.submissions = submissions;
        this.baseDir = Path.of(dir);
    }

    public record StoredFile(byte[] bytes, String mime) {
    }

    @Transactional
    public Attachment store(UUID submissionId, String field, String dataUrl, String mime) {
        if (submissions.findById(submissionId).isEmpty()) {
            throw new NotFoundException("Submission not found");
        }
        if (dataUrl == null || dataUrl.isBlank()) {
            throw new ValidationException("Ficheiro em falta.");
        }
        String base64 = dataUrl.contains(",") ? dataUrl.substring(dataUrl.indexOf(',') + 1) : dataUrl;
        String resolvedMime = mime;
        if (resolvedMime == null && dataUrl.startsWith("data:")) {
            resolvedMime = dataUrl.substring(5, Math.max(5, dataUrl.indexOf(';')));
        }
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(base64);
        } catch (IllegalArgumentException e) {
            throw new ValidationException("Ficheiro inválido.");
        }
        if (bytes.length > MAX_BYTES) {
            throw new ValidationException("Ficheiro demasiado grande.");
        }

        UUID id = UUID.randomUUID();
        String ext = resolvedMime != null && resolvedMime.contains("png") ? ".png" : ".jpg";
        Path dir = baseDir.resolve(submissionId.toString());
        Path file = dir.resolve(id + ext);
        try {
            Files.createDirectories(dir);
            Files.write(file, bytes);
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot store attachment", e);
        }

        Attachment a = new Attachment();
        a.setId(id);
        a.setSubmissionId(submissionId);
        a.setField(field != null ? field : "0.11");
        a.setFilePath(file.toString());
        a.setMime(resolvedMime);
        a.setSizeBytes((long) bytes.length);
        a.setChecksum(sha256(bytes));
        return attachments.save(a);
    }

    @Transactional(readOnly = true)
    public List<Attachment> list(UUID submissionId) {
        return attachments.findBySubmissionIdOrderByCreatedAtAsc(submissionId);
    }

    @Transactional(readOnly = true)
    public StoredFile read(UUID attachmentId) {
        Attachment a = attachments.findById(attachmentId)
                .orElseThrow(() -> new NotFoundException("Attachment not found"));
        try {
            return new StoredFile(Files.readAllBytes(Path.of(a.getFilePath())), a.getMime());
        } catch (IOException e) {
            throw new NotFoundException("Attachment file missing");
        }
    }

    private static String sha256(byte[] bytes) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(bytes));
        } catch (Exception e) {
            return null;
        }
    }
}
