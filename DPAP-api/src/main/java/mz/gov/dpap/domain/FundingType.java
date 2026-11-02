package mz.gov.dpap.domain;

/**
 * How an actor's activity is funded. String values are the wire contract and
 * must stay identical to the frontend `domain.fundingType` dictionary keys.
 */
public enum FundingType {
    SELF,
    PUBLIC,
    PRIVATE,
    DONOR,
    MIXED
}
