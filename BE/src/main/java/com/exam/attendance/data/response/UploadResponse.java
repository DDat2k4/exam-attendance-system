package com.exam.attendance.data.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UploadResponse {
    private String url;
    private String format;
    private String publicId;
    private Long bytes;
}