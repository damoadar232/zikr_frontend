package com.zikrelahi.api.common;

import com.zikrelahi.api.common.ConflictException;
import com.zikrelahi.api.media.MediaConfigurationException;
import com.zikrelahi.api.media.MediaStorageException;
import com.zikrelahi.api.media.MediaValidationException;
import com.zikrelahi.api.quran.importer.ImportResult;
import com.zikrelahi.api.quran.importer.ImportValidationException;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

        @ExceptionHandler(ResourceNotFoundException.class)
        public ResponseEntity<ApiResponse<Void>> handleNotFound(ResourceNotFoundException ex) {
                return ResponseEntity
                                .status(HttpStatus.NOT_FOUND)
                                .body(ApiResponse.error("NOT_FOUND", ex.getMessage()));
        }

        @ExceptionHandler(EntityNotFoundException.class)
        public ResponseEntity<ApiResponse<Void>> handleEntityNotFound(EntityNotFoundException ex) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                                .body(ApiResponse.error("NOT_FOUND", "The requested resource was not found."));
        }

        @ExceptionHandler(ConflictException.class)
        public ResponseEntity<ApiResponse<Void>> handleConflict(ConflictException ex) {
                return ResponseEntity
                                .status(HttpStatus.CONFLICT)
                                .body(ApiResponse.error("CONFLICT", ex.getMessage()));
        }

        @ExceptionHandler({ DataIntegrityViolationException.class, ObjectOptimisticLockingFailureException.class })
        public ResponseEntity<ApiResponse<Void>> handleDataConflict(Exception ex) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                                .body(ApiResponse.error("CONFLICT", "The request conflicts with existing content."));
        }

        @ExceptionHandler(IllegalArgumentException.class)
        public ResponseEntity<ApiResponse<Void>> handleIllegalArgument(IllegalArgumentException ex) {
                return ResponseEntity
                                .status(HttpStatus.BAD_REQUEST)
                                .body(ApiResponse.error("INVALID_PARAMETER", ex.getMessage()));
        }

        @ExceptionHandler(HttpMessageNotReadableException.class)
        public ResponseEntity<ApiResponse<Void>> handleMalformedRequest(Exception ex) {
                return ResponseEntity.badRequest()
                                .body(ApiResponse.error("INVALID_REQUEST",
                                                "The request body or parameters are invalid."));
        }

        @ExceptionHandler(ConstraintViolationException.class)
        public ResponseEntity<ApiResponse<Map<String, String>>> handleConstraintValidation(
                        ConstraintViolationException ex) {
                Map<String, String> fieldErrors = ex.getConstraintViolations().stream()
                                .collect(Collectors.toMap(
                                                violation -> violation.getPropertyPath().toString(),
                                                violation -> violation.getMessage(),
                                                (first, second) -> first));
                return ResponseEntity
                                .status(HttpStatus.BAD_REQUEST)
                                .body(new ApiResponse<>(fieldErrors, "VALIDATION_ERROR", "Request validation failed."));
        }

        @ExceptionHandler(MaxUploadSizeExceededException.class)
        public ResponseEntity<ApiResponse<Void>> handlePayloadTooLarge(MaxUploadSizeExceededException ex) {
                return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                                .body(ApiResponse.error("PAYLOAD_TOO_LARGE", "Request body exceeds the allowed size."));
        }

        @ExceptionHandler(MediaValidationException.class)
        public ResponseEntity<ApiResponse<Void>> handleInvalidMedia(MediaValidationException ex) {
                return ResponseEntity.badRequest()
                                .body(ApiResponse.error("INVALID_MEDIA_FILE", ex.getMessage()));
        }

        @ExceptionHandler(MediaConfigurationException.class)
        public ResponseEntity<ApiResponse<Void>> handleMediaConfiguration(MediaConfigurationException ex) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                                .body(ApiResponse.error("MEDIA_UNAVAILABLE",
                                                "Media storage is not configured or available."));
        }

        @ExceptionHandler(MediaStorageException.class)
        public ResponseEntity<ApiResponse<Void>> handleMediaStorage(MediaStorageException ex) {
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                                .body(ApiResponse.error("MEDIA_STORAGE_FAILED",
                                                "The media storage operation could not be completed."));
        }

        @ExceptionHandler(UnauthorizedException.class)
        public ResponseEntity<ApiResponse<Void>> handleUnauthorized(UnauthorizedException ex) {
                return ResponseEntity
                                .status(HttpStatus.UNAUTHORIZED)
                                .body(ApiResponse.error("UNAUTHORIZED", ex.getMessage()));
        }

        @ExceptionHandler(BadCredentialsException.class)
        public ResponseEntity<ApiResponse<Void>> handleBadCredentials(BadCredentialsException ex) {
                return ResponseEntity
                                .status(HttpStatus.UNAUTHORIZED)
                                .body(ApiResponse.error("INVALID_CREDENTIALS", "Email or password is incorrect."));
        }

        @ExceptionHandler(AccessDeniedException.class)
        public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex) {
                return ResponseEntity
                                .status(HttpStatus.FORBIDDEN)
                                .body(ApiResponse.error("FORBIDDEN", "Insufficient permissions."));
        }

        @ExceptionHandler(MethodArgumentNotValidException.class)
        public ResponseEntity<ApiResponse<Map<String, String>>> handleValidation(
                        MethodArgumentNotValidException ex) {
                Map<String, String> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                                .collect(Collectors.toMap(
                                                FieldError::getField,
                                                fe -> fe.getDefaultMessage() != null ? fe.getDefaultMessage()
                                                                : "Invalid value",
                                                (first, second) -> first));
                return ResponseEntity
                                .status(HttpStatus.BAD_REQUEST)
                                .body(new ApiResponse<>(fieldErrors, "VALIDATION_ERROR", "Request validation failed."));
        }

        @ExceptionHandler(ImportValidationException.class)
        public ResponseEntity<ApiResponse<ImportResult>> handleImportValidation(
                        ImportValidationException ex) {
                return ResponseEntity
                                .status(HttpStatus.UNPROCESSABLE_ENTITY)
                                .body(new ApiResponse<>(ex.getResult(), "VALIDATION_FAILED",
                                                ex.getResult().errorCount() + " validation error(s) found."));
        }

        @ExceptionHandler(Exception.class)
        public ResponseEntity<ApiResponse<Void>> handleGeneric(Exception ex) {
                log.error("Unhandled exception", ex);
                return ResponseEntity
                                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .body(ApiResponse.error("INTERNAL_ERROR", "An unexpected error occurred."));
        }
}
