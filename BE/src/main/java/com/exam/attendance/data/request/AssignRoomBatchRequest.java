package com.exam.attendance.data.request;

import com.exam.attendance.data.pojo.StudentSeatDTO;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class AssignRoomBatchRequest {

    private Long roomId;

    private List<StudentSeatDTO> students;
}
