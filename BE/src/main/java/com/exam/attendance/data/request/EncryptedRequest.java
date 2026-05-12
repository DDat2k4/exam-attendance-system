package com.exam.attendance.data.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class EncryptedRequest {

    private String data;
    private String iv;
    private String signature;
}