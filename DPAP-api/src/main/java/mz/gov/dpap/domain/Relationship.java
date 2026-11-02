package mz.gov.dpap.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

/** A multi-actor network edge extracted from N.03 / J.13 (BRD FR-NET-1). */
@Entity
@Table(name = "relationship")
@Getter
@Setter
@NoArgsConstructor
public class Relationship {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "submission_id", columnDefinition = "uuid")
    private UUID submissionId;

    @Column(name = "source_actor_id", columnDefinition = "uuid")
    private UUID sourceActorId;

    @Column(name = "target_actor_id", columnDefinition = "uuid")
    private UUID targetActorId;

    @Column(name = "target_name", length = 255)
    private String targetName;

    @Column(name = "target_actor_type")
    private Integer targetActorType;

    @Column(name = "target_level")
    private Integer targetLevel;

    @Column(name = "relation_types", columnDefinition = "text")
    private String relationTypes;

    private Integer frequency;
    private Integer rating;

    @Column(name = "support_type")
    private Integer supportType;

    @Column(name = "origin_field", nullable = false, length = 16)
    private String originField;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
