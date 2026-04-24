package com.exam.attendance.data.mapper;

import com.exam.attendance.data.pojo.UserDTO;
import com.exam.attendance.data.response.UserDetailResponse;

public class UserMapper {
    public static UserDetailResponse toResponse(UserDTO dto) {
        return new UserDetailResponse(
                dto.getId(),
                dto.getUsername(),
                dto.getEmail(),
                dto.getPhone(),
                dto.getLastLogin(),
                dto.getName(),
                dto.getActive(),
                dto.getRoles(),
                dto.getPermissions(),
                dto.getActiveTokens()
        );
    }
}