package mz.gov.dpap.domain;

/**
 * The six access roles of the BRD (§3.3). Spring Security authorities are
 * "ROLE_" + name(). Geographic scope (a district list) is held separately in
 * {@code user_scope} (FR-AUTH-2).
 */
public enum Role {
    /** DPAP IT — full technical control. */
    SYS_ADMIN,
    /** Code lists, assignments, validation, de-duplication, publication, exports. */
    DATA_MANAGER,
    /** Reviews, comments, approves/returns own team's submissions. */
    SUPERVISOR,
    /** Collects data (offline/online); edits own drafts and returned submissions. */
    ENUMERATOR,
    /** Read access to approved data, dashboards, map, network, exports (scoped). */
    ANALYST,
    /** Read-only aggregated dashboards and map; personal contacts hidden. */
    PARTNER
}
