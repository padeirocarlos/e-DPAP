package mz.gov.dpap.domain;

import java.util.Set;

/** Submission lifecycle (BRD §4.2). */
public enum SubmissionStatus {
    DRAFT,
    SUBMITTED,
    UNDER_REVIEW,
    RETURNED,
    APPROVED,
    PUBLISHED,
    REJECTED;

    /** Whether a direct transition to {@code target} is allowed from this state. */
    public boolean canTransitionTo(SubmissionStatus target) {
        return switch (this) {
            case DRAFT -> target == SUBMITTED;
            case SUBMITTED -> target == UNDER_REVIEW;
            case UNDER_REVIEW -> Set.of(RETURNED, APPROVED, REJECTED).contains(target);
            case RETURNED -> target == SUBMITTED;
            case APPROVED -> target == PUBLISHED;
            case PUBLISHED, REJECTED -> false;
        };
    }
}
