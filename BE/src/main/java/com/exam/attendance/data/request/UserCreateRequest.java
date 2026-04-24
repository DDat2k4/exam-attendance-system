package com.exam.attendance.data.request;

import lombok.Data;

@Data
public class UserCreateRequest {
    private String username;
    private String email;
    private String phone;
    private String password;
}