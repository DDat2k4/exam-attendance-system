package com.exam.attendance.data.mapper;

import com.exam.attendance.data.entity.Role;
import com.exam.attendance.data.entity.RolePermission;
import com.exam.attendance.data.pojo.RoleDTO;
import com.exam.attendance.data.request.RoleRequest;
import com.exam.attendance.data.response.RoleResponse;

import java.util.List;
import java.util.stream.Collectors;

public class RoleMapper {

    public static RoleDTO toDTO(Role entity) {
        if (entity == null) return null;

        RoleDTO dto = new RoleDTO();
        dto.setId(entity.getId());
        dto.setName(entity.getName());
        dto.setDescription(entity.getDescription());
        return dto;
    }

    public static RoleResponse toResponse(RoleDTO dto) {
        if (dto == null) return null;

        RoleResponse res = new RoleResponse();
        res.setId(dto.getId());
        res.setName(dto.getName());
        res.setDescription(dto.getDescription());
        res.setPermissions(dto.getPermissionCodes());
        return res;
    }

    public static Role toEntity(RoleRequest request) {
        if (request == null) return null;

        Role role = new Role();
        role.setName(request.getName());
        role.setDescription(request.getDescription());
        return role;
    }

    public static void updateEntity(Role role, RoleRequest request) {
        if (role == null || request == null) return;

        role.setName(request.getName());
        role.setDescription(request.getDescription());
    }
}