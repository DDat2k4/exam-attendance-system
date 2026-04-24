package com.exam.attendance.data.pojo;

import lombok.Data;

import java.time.LocalDate;

@Data
public class CCCDInfo {
    private String citizenId;
    private String fullName;
    private LocalDate birthDate;
    private LocalDate expiry;
    private String FaceImage;
}