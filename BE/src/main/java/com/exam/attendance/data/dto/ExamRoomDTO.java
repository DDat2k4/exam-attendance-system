package com.exam.attendance.data.dto;

import lombok.Data;

@Data
public class ExamRoomDTO {

    private Long id;
    private String roomCode;
    private Integer maxStudents;
}
