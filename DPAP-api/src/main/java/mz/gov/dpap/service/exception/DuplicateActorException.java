package mz.gov.dpap.service.exception;

/** Raised when a create/update would produce a duplicate actor (HTTP 409). */
public class DuplicateActorException extends RuntimeException {
    public DuplicateActorException(String message) {
        super(message);
    }
}
