package mz.gov.dpap.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

/** A file (photo 0.11, etc.) attached to a submission (BRD FR-MOB-5). */
@Entity
@Table(name = "attachment")
@Getter
@Setter
@NoArgsConstructor
public class Attachment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "submission_id", nullable = false, columnDefinition = "uuid")
    private UUID submissionId;

    @Column(nullable = false, length = 16)
    private String field;

    @Column(name = "file_path", nullable = false, columnDefinition = "text")
    private String filePath;

    @Column(length = 80)
    private String mime;

    @Column(name = "size_bytes")
    private Long sizeBytes;

    @Column(length = 128)
    private String checksum;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
