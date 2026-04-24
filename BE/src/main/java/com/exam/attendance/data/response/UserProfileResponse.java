package com.exam.attendance.data.response;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class UserProfileResponse {
    private Long id;
    private Long userId;
    private String name;
    private Short gender;
    private LocalDate birthDate;
    private String citizenId;
    private Boolean isVerified;
    private LocalDateTime verifiedAt;
}