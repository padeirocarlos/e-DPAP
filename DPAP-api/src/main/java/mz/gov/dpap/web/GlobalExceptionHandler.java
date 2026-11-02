package mz.gov.dpap.web;

import mz.gov.dpap.dto.ErrorResponse;
import mz.gov.dpap.service.exception.ConflictException;
import mz.gov.dpap.service.exception.DuplicateActorException;
import mz.gov.dpap.service.exception.NotFoundException;
import mz.gov.dpap.service.exception.StaleVersionException;
import mz.gov.dpap.service.exception.ValidationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * Translates exceptions into the `{ message, code }` body + HTTP status that the
 * frontend's `ApiError` maps on (401/403/404/409/422/5xx).
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ErrorResponse> notFound(NotFoundException ex) {
        return body(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getMessage());
    }

    @ExceptionHandler({DuplicateActorException.class, StaleVersionException.class,
            ConflictException.class, ObjectOptimisticLockingFailureException.class})
    public ResponseEntity<ErrorResponse> conflict(Exception ex) {
        return body(HttpStatus.CONFLICT, "CONFLICT", ex.getMessage());
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> badCredentials(BadCredentialsException ex) {
        return body(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Invalid credentials");
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> accessDenied(AccessDeniedException ex) {
        return body(HttpStatus.FORBIDDEN, "FORBIDDEN", "Insufficient permissions");
    }

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ErrorResponse> businessValidation(ValidationException ex) {
        return body(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION", ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> validation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(f -> f.getField() + ": " + f.getDefaultMessage())
                .orElse("Validation failed");
        return body(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION", message);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class,
            MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ErrorResponse> malformed(Exception ex) {
        return body(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION", "Malformed request");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> generic(Exception ex) {
        return body(HttpStatus.INTERNAL_SERVER_ERROR, "SERVER", "Unexpected error");
    }

    private ResponseEntity<ErrorResponse> body(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status).body(new ErrorResponse(message, code));
    }
}
