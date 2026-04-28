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
        dto.setResource(entity.getResource());
        dto.setAction(entity.getAction());
        dto.setDescription(entity.getDescription());

        dto.setCode(buildCode(entity.getResource(), entity.getAction()));

        return dto;
    }

    public static PermissionResponse toResponse(PermissionDTO dto) {
        if (dto == null) return null;

        PermissionResponse res = new PermissionResponse();
        res.setId(dto.getId());
        res.setResource(dto.getResource());
        res.setAction(dto.getAction());
        res.setDescription(dto.getDescription());
        res.setCode(dto.getCode());

        return res;
    }

    public static Permission toEntity(PermissionRequest request) {
        if (request == null) return null;

        Permission entity = new Permission();
        entity.setResource(request.getResource());
        entity.setAction(request.getAction());
        entity.setDescription(request.getDescription());

        return entity;
    }

    public static void updateEntity(Permission entity, PermissionRequest request) {
        if (entity == null || request == null) return;

        entity.setResource(request.getResource());
        entity.setAction(request.getAction());
        entity.setDescription(request.getDescription());
    }

    public static String buildCode(Enum<?> resource, Enum<?> action) {
        if (resource == null || action == null) return null;
        return resource.name().toLowerCase() + ":" + action.name().toLowerCase();
    }
}