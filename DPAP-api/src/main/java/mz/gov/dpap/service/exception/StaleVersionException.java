package mz.gov.dpap.service.exception;

/** Raised when an update's expected version is stale (HTTP 409). */
public class StaleVersionException extends RuntimeException {
    public StaleVersionException(String message) {
        super(message);
    }
}
