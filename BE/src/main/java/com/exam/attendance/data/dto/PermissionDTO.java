package com.exam.attendance.data.dto;

import com.exam.attendance.data.enums.Action;
import com.exam.attendance.data.enums.Resource;
import lombok.Data;

@Data
public class PermissionDTO {

    private Long id;
    private Resource resource;
    private Action action;
    private String code;
    private String description;
}