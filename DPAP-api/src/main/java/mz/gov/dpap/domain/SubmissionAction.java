package mz.gov.dpap.domain;

/** Workflow transition actions (BRD §4.2), mapped to target states + roles. */
public enum SubmissionAction {
    SUBMIT(SubmissionStatus.SUBMITTED),
    OPEN_REVIEW(SubmissionStatus.UNDER_REVIEW),
    RETURN(SubmissionStatus.RETURNED),
    APPROVE(SubmissionStatus.APPROVED),
    REJECT(SubmissionStatus.REJECTED),
    PUBLISH(SubmissionStatus.PUBLISHED);

    private final SubmissionStatus target;

    SubmissionAction(SubmissionStatus target) {
        this.target = target;
    }

    public SubmissionStatus target() {
        return target;
    }

    /** Whether a reason/comment is mandatory (FR-QC-3). */
    public boolean requiresReason() {
        return this == RETURN || this == REJECT;
    }
}
