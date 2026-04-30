package com.exam.attendance.data.pojo;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MyRoomInfoDTO {

    private Long examId;
    private String examTitle;

    private Long roomId;
    private String roomCode;

    private Integer seatNumber;
}
