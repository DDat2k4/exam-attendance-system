package com.exam.attendance.data.pojo;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
@AllArgsConstructor
public class RoomStudentDTO {

    private Long registrationId;

    private Long userId;
    private String username;
    private String fullName;

    private String citizenId;

    private Integer seatNumber;
}
