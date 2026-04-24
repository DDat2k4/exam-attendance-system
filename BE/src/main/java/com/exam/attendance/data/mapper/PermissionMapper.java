package com.exam.attendance.data.mapper;

import com.exam.attendance.data.entity.Permission;
import com.exam.attendance.data.pojo.PermissionDTO;
import com.exam.attendance.data.request.PermissionRequest;
import com.exam.attendance.data.response.PermissionResponse;

public class PermissionMapper {

    public static PermissionDTO toDTO(Permission entity) {
        if (entity == null) return null;

        PermissionDTO dto = new PermissionDTO();
        dto.setId(entity.getId());
        dto.setCode(entity.getCode());
        dto.setDescription(entity.getDescription());
        return dto;
    }

    public static PermissionResponse toResponse(PermissionDTO dto) {
        if (dto == null) return null;

        PermissionResponse res = new PermissionResponse();
        res.setId(dto.getId());
        res.setCode(dto.getCode());
        res.setDescription(dto.getDescription());
        return res;
    }

    public static Permission toEntity(PermissionRequest request) {
        if (request == null) return null;

        Permission entity = new Permission();
        entity.setCode(request.getCode());
        entity.setDescription(request.getDescription());
        return entity;
    }

    public static void updateEntity(Permission entity, PermissionRequest request) {
        if (entity == null || request == null) return;
        entity.setCode(request.getCode());
        entity.setDescription(request.getDescription());
    }
}