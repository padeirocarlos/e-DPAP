package mz.gov.dpap.service.exception;

/**
 * Server-side validation failure (HTTP 422) — e.g. a submission cannot advance
 * while a required, relevant field is empty or a constraint fails (BR-RT-2).
 */
public class ValidationException extends RuntimeException {
    public ValidationException(String message) {
        super(message);
    }
}
