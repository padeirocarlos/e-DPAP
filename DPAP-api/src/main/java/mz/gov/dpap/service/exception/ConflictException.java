package mz.gov.dpap.service.exception;

/** Generic business-rule conflict (HTTP 409), e.g. email in use, self-deletion. */
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
