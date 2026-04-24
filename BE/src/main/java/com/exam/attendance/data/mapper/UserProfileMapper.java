package com.exam.attendance.data.mapper;

import com.exam.attendance.data.entity.User;
import com.exam.attendance.data.entity.UserProfile;
import com.exam.attendance.data.pojo.UserProfileDTO;
import com.exam.attendance.data.request.UserProfileRequest;
import com.exam.attendance.data.response.UserProfileResponse;

import java.time.LocalDateTime;

public class UserProfileMapper {
    // ENTITY -> DTO
    public static UserProfileDTO toDTO(UserProfile entity) {
        if (entity == null) return null;

        UserProfileDTO dto = new UserProfileDTO();
        dto.setId(entity.getId());

        if (entity.getUser() != null) {
            dto.setUserId(entity.getUser().getId());
        }
        dto.setName(entity.getName());
        dto.setGender(entity.getGender());
        dto.setBirthDate(entity.getBirthDate());
        dto.setCitizenId(entity.getCitizenId());
        dto.setIsVerified(entity.getIsVerified());
        dto.setVerifiedAt(entity.getVerifiedAt());
        return dto;
    }

    // DTO -> RESPONSE
    public static UserProfileResponse toResponse(UserProfileDTO dto) {
        if (dto == null) return null;

        UserProfileResponse res = new UserProfileResponse();

        res.setId(dto.getId());
        res.setUserId(dto.getUserId());
        res.setName(dto.getName());
        res.setGender(dto.getGender());
        res.setBirthDate(dto.getBirthDate());
        res.setCitizenId(dto.getCitizenId());
        res.setIsVerified(dto.getIsVerified());
        res.setVerifiedAt(dto.getVerifiedAt());
        return res;
    }

    // REQUEST -> ENTITY
    public static UserProfile toEntity(UserProfileRequest request) {
        if (request == null) return null;

        UserProfile entity = new UserProfile();
        entity.setName(request.getName());
        entity.setGender(request.getGender());
        entity.setBirthDate(request.getBirthDate());
        entity.setCitizenId(request.getCitizenId());

        // default verify state
        entity.setIsVerified(false);
        entity.setVerifiedAt(null);
        // set user
        if (request.getUserId() != null) {
            User user = new User();
            user.setId(request.getUserId());
            entity.setUser(user);
        }

        return entity;
    }

    // UPDATE ENTITY
    public static void updateEntity(UserProfile entity, UserProfileRequest request) {
        if (entity == null || request == null) return;

        entity.setName(request.getName());
        entity.setGender(request.getGender());
        entity.setBirthDate(request.getBirthDate());

        entity.setCitizenId(request.getCitizenId());
    }

    // VERIFY CCCD
    public static void markVerified(UserProfile entity) {
        if (entity == null) return;

        entity.setIsVerified(true);
        entity.setVerifiedAt(LocalDateTime.now());
    }
}