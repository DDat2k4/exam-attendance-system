package com.exam.attendance.data.enums;

public enum AlertType {

    // verify thất bại 1 lần
    VERIFY_FAIL,

    // verify thành công
    VERIFY_SUCCESS,

    // phiên thi bị khóa hoàn toàn
    SESSION_BLOCKED,

    // giám thị/phòng khảo thí duyệt thủ công
    APPROVED,

    // giám thị từ chối thủ công
    REJECTED,

    // session bị đánh dấu nghi vấn
    FLAGGED,

    // gỡ trạng thái nghi vấn
    UNFLAGGED,

    // phát hiện đổi thiết bị
    DEVICE_CHANGED,

    // verify fail nhiều lần trong khoảng thời gian ngắn
    MULTIPLE_VERIFY_FAILED,

    // cần giám thị xác minh thủ công
    MANUAL_REVIEW_REQUIRED,

    // hành vi đáng ngờ nhưng chưa đủ để block
    SUSPICIOUS_ACTIVITY
}