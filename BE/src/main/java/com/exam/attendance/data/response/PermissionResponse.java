package com.exam.attendance.data.response;

import com.exam.attendance.data.pojo.enums.Action;
import com.exam.attendance.data.pojo.enums.Resource;
import lombok.Data;

@Data
public class PermissionResponse {
    private Long id;
    private Resource resource;
    private Action action;
    private String code;
    private String description;
}
