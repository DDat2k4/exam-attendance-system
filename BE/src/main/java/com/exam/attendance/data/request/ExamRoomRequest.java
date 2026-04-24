package com.exam.attendance.data.request;

import lombok.Data;

@Data
public class ExamRoomRequest {
    private String roomCode;
    private Integer maxStudents;
}