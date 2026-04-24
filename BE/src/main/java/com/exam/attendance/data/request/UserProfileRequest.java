package com.exam.attendance.data.request;

import lombok.Data;

import java.time.LocalDate;

@Data
public class UserProfileRequest {
    private Long userId;
    private String name;
    private Short gender;
    private LocalDate birthDate;
    private String citizenId;
}