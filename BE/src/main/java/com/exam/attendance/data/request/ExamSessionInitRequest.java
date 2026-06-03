package com.exam.attendance.data.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ExamSessionInitRequest {

    private Long examId;
    private String deviceId;
}