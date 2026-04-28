package com.exam.attendance.data.pojo.enums;

public enum ApiMessage {
    SUCCESS("Success"),
    CREATED("Created successfully"),
    UPDATED("Updated successfully"),
    DELETED("Deleted successfully"),
    FAILED("Failed");

    private final String message;

    ApiMessage(String message) {
        this.message = message;
    }

    public String getMessage() {
        return message;
    }
}
