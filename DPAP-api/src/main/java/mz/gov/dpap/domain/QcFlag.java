package mz.gov.dpap.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

/** An automated quality-control flag raised on a submission (BRD FR-QC-1, §8.3). */
@Entity
@Table(name = "qc_flag")
@Getter
@Setter
@NoArgsConstructor
public class QcFlag {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "submission_id", nullable = false, columnDefinition = "uuid")
    private UUID submissionId;

    @Column(name = "rule_id", nullable = false, length = 16)
    private String ruleId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 8)
    private QcSeverity severity;

    @Column(length = 500)
    private String message;

    @Column(nullable = false)
    private boolean resolved = false;

    @Column(name = "resolved_by", length = 160)
    private String resolvedBy;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
