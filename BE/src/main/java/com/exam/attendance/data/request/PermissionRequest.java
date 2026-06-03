package com.exam.attendance.data.request;

import com.exam.attendance.data.enums.Action;
import com.exam.attendance.data.enums.Resource;
import lombok.Data;

@Data
public class PermissionRequest {

    private Resource resource;
    private Action action;
    private String description;
}
