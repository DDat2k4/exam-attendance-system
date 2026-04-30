package com.exam.attendance.data.request;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.time.LocalDate;

@Data
public class UserProfileRequest {
    private Long userId;
    private String name;
    private Short gender;
    private LocalDate birthDate;

    @NotBlank(message = "CCCD không được để trống")
    @Pattern(regexp = "\\d{12}", message = "CCCD phải gồm đúng 12 chữ số")
    private String citizenId;
}