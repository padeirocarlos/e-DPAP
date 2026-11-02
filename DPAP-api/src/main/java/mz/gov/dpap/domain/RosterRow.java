package mz.gov.dpap.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * One roster row extracted from a submission's answers (BRD §6.1). Generic: the
 * roster is identified by {@code rosterId} and the columns live in {@code data}.
 */
@Entity
@Table(name = "roster_row")
@Getter
@Setter
@NoArgsConstructor
public class RosterRow {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "submission_id", nullable = false, columnDefinition = "uuid")
    private UUID submissionId;

    @Column(name = "roster_id", nullable = false, length = 16)
    private String rosterId;

    @Column(name = "row_index", nullable = false)
    private int rowIndex = 0;

    @Column(name = "row_code")
    private Integer rowCode;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> data = new HashMap<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
