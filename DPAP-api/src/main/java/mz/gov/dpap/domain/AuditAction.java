package mz.gov.dpap.domain;

public enum AuditAction {
    CREATE,
    UPDATE,
    DELETE,
    /** A data export (BRD NFR-8/17: audit of all exports). */
    EXPORT
}
