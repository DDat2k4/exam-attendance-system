package com.exam.attendance.data.response;

import lombok.Data;
import java.util.List;

@Data
public class PermissionGroupResponse {
    private String group;
    private List<PermissionItem> permissions;
}