package com.exam.attendance.data.request;

import lombok.Data;

@Data
public class ManualCheckinRequest {

    private Long examSessionId;
    private String base64Image;
    private String reason;
}
