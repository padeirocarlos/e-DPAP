package mz.gov.dpap.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

/**
 * A data-collection campaign (BRD FR-ADM-3), e.g. "Baseline 2026" or
 * "Actualização 2028", bound to a {@link FormVersion}. Submissions carry their
 * round so longitudinal rounds coexist and history is preserved (BR-RG-3).
 */
@Entity
@Table(name = "survey_round")
@Getter
@Setter
@NoArgsConstructor
public class SurveyRound {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(nullable = false, length = 120)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private SurveyRoundStatus status = SurveyRoundStatus.PLANNED;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "form_version_id")
    private FormVersion formVersion;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
