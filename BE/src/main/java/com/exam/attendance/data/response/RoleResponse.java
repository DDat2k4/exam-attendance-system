package com.exam.attendance.data.response;

import lombok.Data;

import java.util.List;

@Data
public class RoleResponse {
    private Long id;
    private String name;
    private String description;
    private List<String> permissions;
}
