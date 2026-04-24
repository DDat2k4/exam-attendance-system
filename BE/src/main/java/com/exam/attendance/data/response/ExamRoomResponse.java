package com.exam.attendance.data.response;

import lombok.Data;

@Data
public class ExamRoomResponse {
    private Long id;
    private String roomCode;
    private Integer maxStudents;
}