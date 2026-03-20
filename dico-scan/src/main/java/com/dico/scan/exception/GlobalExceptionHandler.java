package com.dico.scan.exception;

import com.dico.scan.dto.response.StandardError;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.UUID;
import java.util.stream.Collectors;


/**
 * Centralized exception mapping to StandardError responses.
 * Every error response includes a unique trace_id for log correlation.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

        @ExceptionHandler(ProductNotFoundException.class)
        public ResponseEntity<StandardError> handleProductNotFound(ProductNotFoundException ex,
                        HttpServletRequest request) {
                String traceId = generateTraceId(request);
                log.warn("[{}] Product not found: {}", traceId, ex.getBarcode());
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                                .body(new StandardError("PRODUCT_NOT_FOUND", ex.getMessage(), traceId));
        }

        @ExceptionHandler(PremiumRequiredException.class)
        public ResponseEntity<StandardError> handlePremiumRequired(PremiumRequiredException ex,
                        HttpServletRequest request) {
                String traceId = generateTraceId(request);
                log.info("[{}] Premium feature blocked: {}", traceId, ex.getMessage());
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body(new StandardError("PREMIUM_REQUIRED", ex.getMessage(), traceId));
        }
        
        @ExceptionHandler(TooManyRequestsException.class)
        public ResponseEntity<StandardError> handleTooManyRequests(TooManyRequestsException ex,
                        HttpServletRequest request) {
                String traceId = generateTraceId(request);
                log.warn("[{}] Rate limited: {}", traceId, ex.getMessage());
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                                .body(new StandardError("TOO_MANY_REQUESTS", ex.getMessage(), traceId));
        }
        
        @ExceptionHandler(NotEnoughTokensException.class)
        public ResponseEntity<StandardError> handleNotEnoughTokens(NotEnoughTokensException ex,
                        HttpServletRequest request) {
                String traceId = generateTraceId(request);
                log.info("[{}] Token balance empty: {}", traceId, ex.getMessage());
                return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED)
                                .body(new StandardError("NOT_ENOUGH_TOKENS", ex.getMessage(), traceId));
        }

        @ExceptionHandler(ExternalServiceException.class)
        public ResponseEntity<StandardError> handleExternalService(ExternalServiceException ex,
                        HttpServletRequest request) {
                String traceId = generateTraceId(request);
                log.error("[{}] External service failure: {}", traceId, ex.getMessage(), ex);
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                                .body(new StandardError("EXTERNAL_SERVICE_ERROR",
                                                "Upstream service temporarily unavailable.",
                                                traceId));
        }

        @ExceptionHandler(MethodArgumentNotValidException.class)
        public ResponseEntity<StandardError> handleValidation(MethodArgumentNotValidException ex,
                        HttpServletRequest request) {
                String traceId = generateTraceId(request);
                String details = ex.getBindingResult().getFieldErrors().stream()
                                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                                .collect(Collectors.joining("; "));
                log.warn("[{}] Validation failed: {}", traceId, details);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                .body(new StandardError("VALIDATION_ERROR", details, traceId));
        }

        @ExceptionHandler(Exception.class)
        public ResponseEntity<StandardError> handleGeneric(Exception ex, HttpServletRequest request) {
                String traceId = generateTraceId(request);
                log.error("[{}] Unexpected error: {}", traceId, ex.getMessage(), ex);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .body(new StandardError("INTERNAL_ERROR", "An unexpected error occurred.", traceId));
        }

        private String generateTraceId(HttpServletRequest request) {
                // Use X-Trace-Id header from client if present, otherwise generate
                String headerTraceId = request.getHeader("X-Trace-Id");
                return headerTraceId != null ? headerTraceId
                                : UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        }
}
