package com.exam.attendance.service;

import com.exam.attendance.data.entity.Permission;
import com.exam.attendance.data.mapper.PermissionMapper;
import com.exam.attendance.data.pojo.PermissionDTO;
import com.exam.attendance.data.request.PermissionRequest;
import com.exam.attendance.data.response.PermissionGroupResponse;
import com.exam.attendance.data.response.PermissionItem;
import com.exam.attendance.repository.PermissionRepository;

import com.exam.attendance.repository.RolePermissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PermissionService {

    private final PermissionRepository repo;
    private final RolePermissionRepository rolePermissionRepository;

    public PermissionDTO getById(Long id) {
        return repo.findById(id)
                .map(PermissionMapper::toDTO)
                .orElseThrow(() -> new RuntimeException("Permission not found"));
    }

    public Page<PermissionDTO> getAll(String code, Pageable pageable) {
        return repo.findAll(pageable)
                .map(PermissionMapper::toDTO);
    }

    public Long create(PermissionRequest request) {
        if (repo.findByCode(request.getCode()).isPresent()) {
            throw new RuntimeException("Code already exists");
        }
        Permission entity = PermissionMapper.toEntity(request);
        return repo.save(entity).getId();
    }

    public void update(Long id, PermissionRequest request) {
        Permission entity = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Permission not found"));

        if (repo.findByCode(request.getCode()).isPresent()) {
            throw new RuntimeException("Code already exists");
        }
        PermissionMapper.updateEntity(entity, request);
        repo.save(entity);
    }

    public void delete(Long id) {

        if (!repo.existsById(id)) {
            throw new RuntimeException("Permission not found");
        }

        boolean isUsed = rolePermissionRepository.existsByPermissionId(id);

        if (isUsed) {
            throw new RuntimeException("Permission đang được sử dụng, không thể xóa");
        }

        repo.deleteById(id);
    }

    public List<PermissionGroupResponse> getGroupedPermissions() {

        return repo.findAll().stream()
                .filter(p -> p.getCode() != null && p.getCode().contains("_"))
                .collect(Collectors.groupingBy(
                        p -> p.getCode().split("_")[0], // GROUP
                        Collectors.mapping(p -> {
                            PermissionItem item = new PermissionItem();
                            item.setId(p.getId());
                            item.setAction(p.getCode().split("_")[1]);
                            return item;
                        }, Collectors.toList())
                ))
                .entrySet()
                .stream()
                .map(entry -> {
                    PermissionGroupResponse res = new PermissionGroupResponse();
                    res.setGroup(entry.getKey());
                    res.setPermissions(entry.getValue());
                    return res;
                })
                .toList();
    }
}