package mz.gov.dpap.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

/** A programme/project extracted from K.08 / L.11 / M.07 (BRD IND-16). */
@Entity
@Table(name = "programme")
@Getter
@Setter
@NoArgsConstructor
public class Programme {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "submission_id", columnDefinition = "uuid")
    private UUID submissionId;

    @Column(name = "actor_id", columnDefinition = "uuid")
    private UUID actorId;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(name = "thematic_area", length = 64)
    private String thematicArea;

    @Column(columnDefinition = "text")
    private String districts;

    @Column(name = "beneficiaries_men")
    private Integer beneficiariesMen;

    @Column(name = "beneficiaries_women")
    private Integer beneficiariesWomen;

    @Column(name = "funding_source", length = 255)
    private String fundingSource;

    @Column(name = "budget_usd", precision = 16, scale = 2)
    private BigDecimal budgetUsd;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "origin_field", nullable = false, length = 16)
    private String originField;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
