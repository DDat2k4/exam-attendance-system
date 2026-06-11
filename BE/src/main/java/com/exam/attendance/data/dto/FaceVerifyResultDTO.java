package com.exam.attendance.data.dto;

import lombok.Data;

@Data
public class FaceVerifyResultDTO {

    private boolean passed;
    private double confidence;
}