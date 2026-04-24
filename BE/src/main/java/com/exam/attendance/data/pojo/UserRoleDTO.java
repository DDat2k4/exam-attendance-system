package com.exam.attendance.data.pojo;

import lombok.Data;

@Data
public class UserRoleDTO {

    private Long id;

    private Long userId;
    private Long roleId;

    private String roleName;
}