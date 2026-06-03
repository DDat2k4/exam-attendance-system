package com.exam.attendance.service.user;

import com.exam.attendance.data.entity.UserProfile;
import com.exam.attendance.data.mapper.UserProfileMapper;
import com.exam.attendance.data.dto.UserProfileDTO;
import com.exam.attendance.data.request.UserProfileRequest;
import com.exam.attendance.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserProfileService {

    private final UserProfileRepository repo;

    public UserProfileDTO getByUserId(Long id) {
        return repo.findByUserId(id)
                .map(UserProfileMapper::toDTO)
                .orElseThrow(() -> new RuntimeException("Profile not found"));
    }

    public UserProfileDTO getById(Long id) {
        return repo.findById(id)
                .map(UserProfileMapper::toDTO)
                .orElseThrow(() -> new RuntimeException("Profile not found"));
    }

    public Page<UserProfileDTO> getAll(String name, Pageable pageable) {

        Page<UserProfile> page;

        if (name == null || name.isBlank()) {
            page = repo.findAll(pageable);
        } else {
            page = repo.findByNameContainingIgnoreCase(name, pageable);
        }

        return page.map(UserProfileMapper::toDTO);
    }

    @Transactional
    public Long create(UserProfileRequest request) {

        String citizenId = request.getCitizenId().trim();

        // check trùng CCCD
        if (repo.existsByCitizenId(citizenId)) {
            throw new RuntimeException("CCCD đã tồn tại");
        }

        UserProfile entity = UserProfileMapper.toEntity(request);

        return repo.save(entity).getId();
    }

    public void update(Long id, UserProfileRequest request) {
        UserProfile entity = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Profile not found"));

        UserProfileMapper.updateEntity(entity, request);
        repo.save(entity);
    }

    public void delete(Long id) {
        repo.deleteById(id);
    }
}