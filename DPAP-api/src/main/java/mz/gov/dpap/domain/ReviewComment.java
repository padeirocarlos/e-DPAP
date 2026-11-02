package mz.gov.dpap.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

/** A reviewer comment on a submission, optionally pinned to a field (FR-QC-3/4). */
@Entity
@Table(name = "review_comment")
@Getter
@Setter
@NoArgsConstructor
public class ReviewComment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "submission_id", nullable = false, columnDefinition = "uuid")
    private UUID submissionId;

    @Column(length = 16)
    private String field;

    @Column(nullable = false, columnDefinition = "text")
    private String comment;

    @Column(nullable = false, length = 160)
    private String author;

    @Column(length = 16)
    private String status;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
