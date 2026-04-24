package com.exam.attendance.data.pojo.report;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class LogReportDTO {

    private String action;
    private String type;
    private String result;
    private LocalDateTime createdAt;
    private String detail;
}
