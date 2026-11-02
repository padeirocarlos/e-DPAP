package mz.gov.dpap.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Generated;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.generator.EventType;
import org.hibernate.type.SqlTypes;

/**
 * One interview (questionnaire instance) — BRD §6. Routing and registry keys are
 * typed columns; all other scalar answers live in {@link #answers} (jsonb) so the
 * row stays stable across form versions (FR-FORM-10). The PostGIS {@code geom}
 * column is DB-generated from lat/lon (V6) and not mapped here.
 */
@Entity
@Table(name = "submission")
@Getter
@Setter
@NoArgsConstructor
public class Submission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    /** 0.01 — DB-generated sequence; read back after insert. */
    @Generated(event = EventType.INSERT)
    @Column(name = "questionnaire_number", insertable = false, updatable = false)
    private Long questionnaireNumber;

    /** Client-generated UUID for idempotent sync (NFR-9). */
    @Column(name = "client_uuid", columnDefinition = "uuid")
    private UUID clientUuid;

    @Column(name = "actor_id", columnDefinition = "uuid")
    private UUID actorId;

    @Column(name = "round_id", columnDefinition = "uuid")
    private UUID roundId;

    @Column(name = "form_version", nullable = false, length = 32)
    private String formVersion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private SubmissionStatus status = SubmissionStatus.DRAFT;

    @Column(name = "enumerator_id", columnDefinition = "uuid")
    private UUID enumeratorId;

    @Column(name = "supervisor_id", columnDefinition = "uuid")
    private UUID supervisorId;

    // --- Module 0 typed keys ---
    @Column(name = "interview_date")
    private LocalDate interviewDate;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(name = "district_code", length = 16)
    private String districtCode;

    @Column(name = "admin_post", length = 255)
    private String adminPost;

    @Column(length = 255)
    private String locality;

    @Column(length = 255)
    private String village;

    private Double latitude;
    private Double longitude;

    @Column(name = "gps_accuracy_m")
    private Double gpsAccuracyM;

    @Column(name = "gps_altitude_m")
    private Double gpsAltitudeM;

    private Boolean consent;

    @Column(name = "actor_type")
    private Integer actorType;

    @Column(name = "interview_result")
    private Integer interviewResult;

    // --- Module A registry keys ---
    @Column(name = "actor_name", length = 255)
    private String actorName;

    @Column(length = 255)
    private String acronym;

    @Column(name = "operation_level")
    private Integer operationLevel;

    @Column(name = "legal_status")
    private Integer legalStatus;

    @Column(length = 9)
    private String nuit;

    @Column(name = "contact_sharing_consent")
    private Boolean contactSharingConsent;

    // --- All other scalar answers, keyed by variable (qX_YY) ---
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "answers", columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> answers = new HashMap<>();

    // --- Paradata / sync envelope ---
    @Column(name = "device_id", length = 120)
    private String deviceId;

    @Column(name = "app_version", length = 40)
    private String appVersion;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "sync_status", nullable = false, length = 16)
    private SyncStatus syncStatus = SyncStatus.SYNCED;

    @Version
    @Column(nullable = false)
    private Long version;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "created_by", length = 160)
    private String createdBy;

    @Column(name = "updated_by", length = 160)
    private String updatedBy;
}
