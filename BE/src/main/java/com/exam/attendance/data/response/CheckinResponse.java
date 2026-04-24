package com.exam.attendance.data.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CheckinResponse {
    private Long userId;
    private String name;
    private String citizenId;
    private boolean matched;
    private double confidence;
}
