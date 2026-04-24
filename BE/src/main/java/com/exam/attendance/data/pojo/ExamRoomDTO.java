package com.exam.attendance.data.pojo;

import lombok.Data;

@Data
public class ExamRoomDTO {
    private Long id;
    private String roomCode;
    private Integer maxStudents;
}
