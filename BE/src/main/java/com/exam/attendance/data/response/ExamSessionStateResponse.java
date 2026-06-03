package com.exam.attendance.data.response;

import com.exam.attendance.data.enums.AttendanceStatus;
import com.exam.attendance.data.enums.ExamSessionStatus;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ExamSessionStateResponse {

    private Long sessionId;
    private ExamSessionStatus sessionStatus;
    private AttendanceStatus attendanceStatus;
    private Boolean canEnterExam;
    private Boolean waitingProctor;
    private Boolean blocked;
    private String message;
}
