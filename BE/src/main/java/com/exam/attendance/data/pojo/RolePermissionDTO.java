package com.exam.attendance.data.pojo;

import lombok.Data;

@Data
public class RolePermissionDTO {

    private Long id;

    private Long roleId;
    private Long permissionId;

    private String permissionCode;
}