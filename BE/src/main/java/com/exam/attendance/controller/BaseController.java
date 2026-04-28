package com.exam.attendance.controller;

import com.exam.attendance.data.pojo.enums.ApiMessage;
import com.exam.attendance.data.response.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

public abstract class BaseController {

    protected <T> ResponseEntity<ApiResponse<T>> success(T data) {
        return build(HttpStatus.OK, ApiMessage.SUCCESS, data);
    }

    protected <T> ResponseEntity<ApiResponse<T>> created(T data) {
        return build(HttpStatus.CREATED, ApiMessage.CREATED, data);
    }

    protected <T> ResponseEntity<ApiResponse<T>> updated(T data) {
        return build(HttpStatus.OK, ApiMessage.UPDATED, data);
    }

    protected ResponseEntity<ApiResponse<Void>> deleted() {
        return build(HttpStatus.OK, ApiMessage.DELETED, null);
    }

    protected <T> ResponseEntity<ApiResponse<T>> fail(T data) {
        return build(HttpStatus.BAD_REQUEST, ApiMessage.FAILED, data);
    }

    private <T> ResponseEntity<ApiResponse<T>> build(
            HttpStatus status,
            ApiMessage message,
            T data
    ) {
        return ResponseEntity
                .status(status)
                .body(new ApiResponse<>(
                        status.value(),
                        message.getMessage(),
                        data
                ));
    }
}
