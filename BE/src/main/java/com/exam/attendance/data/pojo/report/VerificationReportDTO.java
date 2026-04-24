package com.exam.attendance.data.pojo.report;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class VerificationReportDTO {

    private String citizenId;
    private Integer attemptNo;
    private Boolean verified;
    private Double confidence;
    private String failReason;
    private String deviceId;
}
