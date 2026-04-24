package com.exam.attendance.data.pojo;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class UserProfileDTO {
    private Long id;
    private Long userId;
    private String name;
    private Short gender;
    private LocalDate birthDate;
    private String citizenId;
    private Boolean isVerified;
    private LocalDateTime verifiedAt;
}