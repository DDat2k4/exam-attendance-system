package com.exam.attendance.data.dto;

import lombok.Data;

@Data
public class UserRoleDTO {

    private Long id;
    private Long userId;
    private Long roleId;
    private String roleName;
}