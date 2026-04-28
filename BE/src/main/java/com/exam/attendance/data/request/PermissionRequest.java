package com.exam.attendance.data.request;

import com.exam.attendance.data.pojo.enums.Action;
import com.exam.attendance.data.pojo.enums.Resource;
import lombok.Data;

@Data
public class PermissionRequest {
    private Resource resource;
    private Action action;
    private String description;
}
