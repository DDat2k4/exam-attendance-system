package com.exam.attendance.data.request;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class CheckinRequest {

    private String citizenId;
    private String fullName;
    private LocalDate birthDate;
    private LocalDate expiry;
    // ảnh lấy từ NFC / CCCD
    private String faceImage;
    // webcam realtime
    private String webcamImage;
    // kỳ học
    private String semester;
    // mã kỳ thi
    private String examCode;
    // mã phòng thi
    private String roomCode;
}