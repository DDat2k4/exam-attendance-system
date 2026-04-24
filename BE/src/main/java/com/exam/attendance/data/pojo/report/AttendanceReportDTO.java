package com.exam.attendance.data.pojo.report;

import com.exam.attendance.data.pojo.AttendanceStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class AttendanceReportDTO {
    private String citizenId;
    private String name;
    private AttendanceStatus status;
    private LocalDateTime checkinTime;
    private String verifiedBy;
    private String roomName;
}
