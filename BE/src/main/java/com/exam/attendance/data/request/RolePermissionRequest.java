package com.exam.attendance.data.request;

import lombok.Data;

import java.util.List;

@Data
public class RolePermissionRequest {
    private List<Long> permissionIds;
}
