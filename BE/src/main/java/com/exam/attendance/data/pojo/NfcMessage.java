package com.exam.attendance.data.pojo;

import lombok.Data;

@Data
public class NfcMessage {
    private String uid;
    private String deviceId;
    private long timestamp;
}
