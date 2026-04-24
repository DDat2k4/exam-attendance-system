package com.exam.attendance.data.request;

import lombok.Data;

import java.util.List;

@Data
public class ExamRegistrationRequest {
    private Long examId;
    private List<Long> userIds;
}