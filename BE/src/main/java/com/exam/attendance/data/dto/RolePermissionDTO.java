package com.exam.attendance.data.dto;

import lombok.Data;

@Data
public class RolePermissionDTO {

    private Long id;
    private Long roleId;
    private Long permissionId;
    private String permissionCode;
}