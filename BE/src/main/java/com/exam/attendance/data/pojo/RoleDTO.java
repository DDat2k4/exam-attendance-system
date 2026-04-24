package com.exam.attendance.data.pojo;

import lombok.Data;

import java.util.List;

@Data
public class RoleDTO {
    private Long id;
    private String name;
    private String description;
    private List<String> permissionCodes;
}