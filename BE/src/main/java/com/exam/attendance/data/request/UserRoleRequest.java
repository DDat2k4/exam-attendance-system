package com.exam.attendance.data.request;

import lombok.Data;

import java.util.List;

@Data
public class UserRoleRequest {
    private List<Long> roleIds;
}
