package com.exam.attendance.data.response;

import com.exam.attendance.data.enums.ExamSessionStatus;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class VerifyResponse {

    private boolean passed;
    private double confidence;
    private int attempt;
    private int maxAttempt;
    private int remainingAttempt;
    private ExamSessionStatus sessionStatus;
    private boolean reconnect;
    private String message;
}
