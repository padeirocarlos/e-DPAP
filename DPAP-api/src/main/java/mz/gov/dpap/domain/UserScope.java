package mz.gov.dpap.domain;

import jakarta.persistence.*;
import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A district a user is scoped to (BRD FR-AUTH-2). No rows for a user = province-
 * wide access. Composite key (user_id, district_code).
 */
@Entity
@Table(name = "user_scope")
@IdClass(UserScope.Key.class)
@Getter
@Setter
@NoArgsConstructor
public class UserScope {

    @Id
    @Column(name = "user_id", columnDefinition = "uuid")
    private UUID userId;

    @Id
    @Column(name = "district_code", length = 16)
    private String districtCode;

    public UserScope(UUID userId, String districtCode) {
        this.userId = userId;
        this.districtCode = districtCode;
    }

    /** Composite primary key. */
    @Getter
    @Setter
    @NoArgsConstructor
    public static class Key implements Serializable {
        private UUID userId;
        private String districtCode;

        @Override
        public boolean equals(Object o) {
            if (this == o) {
                return true;
            }
            if (!(o instanceof Key key)) {
                return false;
            }
            return Objects.equals(userId, key.userId) && Objects.equals(districtCode, key.districtCode);
        }

        @Override
        public int hashCode() {
            return Objects.hash(userId, districtCode);
        }
    }
}
