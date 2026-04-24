package com.exam.attendance.data.response;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class ExamResponse {

    private Long id;
    private String title;
    private String description;
    private LocalDateTime startTime;
    private LocalDateTime endTime;

    private Long createdById;
    private String createdByUsername;

    private List<ExamRoomResponse> rooms;
}