package com.exam.attendance.controller;

import com.exam.attendance.data.enums.ApiMessage;
import com.exam.attendance.data.response.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

public abstract class BaseController {

    protected <T> ResponseEntity<ApiResponse<T>> success(T data) {
        return build(HttpStatus.OK, ApiMessage.SUCCESS, data);
    }

    protected <T> ResponseEntity<ApiResponse<T>> success(
            String message,
            T data
    ) {
        return build(HttpStatus.OK, message, data);
    }

    protected <T> ResponseEntity<ApiResponse<T>> created(T data) {
        return build(HttpStatus.CREATED, ApiMessage.CREATED, data);
    }

    protected <T> ResponseEntity<ApiResponse<T>> created(
            String message,
            T data
    ) {
        return build(HttpStatus.CREATED, message, data);
    }

    protected <T> ResponseEntity<ApiResponse<T>> updated(T data) {
        return build(HttpStatus.OK, ApiMessage.UPDATED, data);
    }

    protected <T> ResponseEntity<ApiResponse<T>> updated(
            String message,
            T data
    ) {
        return build(HttpStatus.OK, message, data);
    }

    protected ResponseEntity<ApiResponse<Void>> deleted() {
        return build(HttpStatus.OK, ApiMessage.DELETED, null);
    }

    protected ResponseEntity<ApiResponse<Void>> deleted(
            String message
    ) {
        return build(HttpStatus.OK, message, null);
    }

    protected <T> ResponseEntity<ApiResponse<T>> fail(T data) {
        return build(HttpStatus.BAD_REQUEST, ApiMessage.FAILED, data);
    }

    protected <T> ResponseEntity<ApiResponse<T>> fail(
            String message,
            T data
    ) {
        return build(HttpStatus.BAD_REQUEST, message, data);
    }

    private <T> ResponseEntity<ApiResponse<T>> build(
            HttpStatus status,
            ApiMessage message,
            T data
    ) {
        return build(
                status,
                message.getMessage(),
                data
        );
    }

    private <T> ResponseEntity<ApiResponse<T>> build(
            HttpStatus status,
            String message,
            T data
    ) {
        return ResponseEntity
                .status(status)
                .body(
                        new ApiResponse<>(
                                status.value(),
                                message,
                                data
                        )
                );
    }
}