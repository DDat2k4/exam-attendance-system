package com.exam.attendance.data.enums;

public enum ExamSessionStatus {
    INIT,   // Chưa điểm danh
    CHECKED_IN,   // Đã điểm danh ngoài phòng
    IN_PROGRESS,
    DONE,
    BLOCKED,
    PENDING_REVIEW,   // Chờ giám thị duyệt
    PENDING_DEVICE_APPROVAL,    // Phiên đang chờ giám thị duyệt thiết bị
    PENDING_VERIFY_REVIEW   // Đang chờ duyệt xác minh
}