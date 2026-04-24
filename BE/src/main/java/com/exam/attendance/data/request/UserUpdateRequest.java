package com.exam.attendance.data.request;

import lombok.Data;

@Data
public class UserUpdateRequest {
    private String email;
    private String password;
    private Short active;
}
