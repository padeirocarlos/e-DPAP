package mz.gov.dpap.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

/**
 * A versioned questionnaire schema (BRD FR-FORM-10). {@code schemaJson} holds
 * the data dictionary for this version — the contents of form_schema.json
 * (the {@code @dpap/schema} package) — so old submissions stay readable and the
 * schema can be exported per version (FR-EXP-3).
 */
@Entity
@Table(name = "form_version")
@Getter
@Setter
@NoArgsConstructor
public class FormVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(nullable = false, unique = true, length = 32)
    private String version;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private FormVersionStatus status = FormVersionStatus.DRAFT;

    @Column(name = "schema_json", nullable = false, columnDefinition = "text")
    private String schemaJson;

    @Column(name = "published_at")
    private Instant publishedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
