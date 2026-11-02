package mz.gov.dpap.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

/** An immutable record of a data-mutating action (audit trail). */
@Entity
@Table(name = "audit_log")
@Getter
@Setter
@NoArgsConstructor
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant at;

    @Column(name = "actor_email", nullable = false, length = 160)
    private String actorEmail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private AuditAction action;

    @Column(name = "entity_type", nullable = false, length = 40)
    private String entityType;

    @Column(name = "entity_id", nullable = false, length = 64)
    private String entityId;

    @Column(length = 240)
    private String summary;
}
