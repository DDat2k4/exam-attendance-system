package com.exam.attendance.service;

import com.exam.attendance.data.entity.Permission;
import com.exam.attendance.data.mapper.PermissionMapper;
import com.exam.attendance.data.pojo.enums.Action;
import com.exam.attendance.data.pojo.PermissionDTO;
import com.exam.attendance.data.pojo.enums.Resource;
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

    public Page<PermissionDTO> getAll(String resource, Pageable pageable) {
        Page<Permission> page;

        if (resource != null && !resource.isBlank()) {
            Resource resEnum = Resource.valueOf(resource.toUpperCase());
            page = repo.findByResource(resEnum, pageable);
        } else {
            page = repo.findAll(pageable);
        }

        return page.map(PermissionMapper::toDTO);
    }

    public Long create(PermissionRequest request) {

        Resource resource = request.getResource();
        Action action = request.getAction();

        if (repo.existsByResourceAndAction(resource, action)) {
            throw new RuntimeException("Permission already exists");
        }

        Permission entity = new Permission();
        entity.setResource(resource);
        entity.setAction(action);
        entity.setDescription(request.getDescription());

        return repo.save(entity).getId();
    }

    public void update(Long id, PermissionRequest request) {

        Permission entity = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Permission not found"));

        Resource resource = request.getResource();
        Action action = request.getAction();

        boolean exists = repo.existsByResourceAndAction(resource, action);

        if (exists && (!entity.getResource().equals(resource) || !entity.getAction().equals(action))) {
            throw new RuntimeException("Permission already exists");
        }

        entity.setResource(resource);
        entity.setAction(action);
        entity.setDescription(request.getDescription());

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
                .collect(Collectors.groupingBy(
                        p -> p.getResource().name(),
                        Collectors.mapping(p -> {
                            PermissionItem item = new PermissionItem();
                            item.setId(p.getId());
                            item.setAction(p.getAction().name());
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