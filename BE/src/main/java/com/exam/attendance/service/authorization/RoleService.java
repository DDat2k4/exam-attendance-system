package com.exam.attendance.service;

import com.exam.attendance.data.entity.Role;
import com.exam.attendance.data.entity.RolePermission;
import com.exam.attendance.data.mapper.RoleMapper;
import com.exam.attendance.data.pojo.RoleDTO;
import com.exam.attendance.data.request.RoleRequest;
import com.exam.attendance.repository.RolePermissionRepository;
import com.exam.attendance.repository.RoleRepository;
import com.exam.attendance.repository.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoleService {

    private final RoleRepository repo;
    private final RolePermissionRepository rolePermissionRepository;
    private final UserRoleRepository  userRoleRepository;

    public RoleDTO getById(Long id) {
        return repo.findById(id)
                .map(RoleMapper::toDTO)
                .orElseThrow(() -> new RuntimeException("Role not found"));
    }

    public Page<RoleDTO> getAll(String name, Pageable pageable) {

        // normalize input
        String keyword = (name == null || name.trim().isEmpty())
                ? null
                : name.trim();

        // lấy page role
        Page<Role> rolePage = repo.search(keyword, pageable);
        List<Role> roles = rolePage.getContent();

        // lấy roleIds
        List<Long> roleIds = roles.stream()
                .map(Role::getId)
                .toList();

        // lấy role-permissions
        List<RolePermission> rpList = roleIds.isEmpty()
                ? List.of()
                : rolePermissionRepository.findByRoleIds(roleIds);

        Map<Long, List<String>> permissionMap = rpList.stream()
                .collect(Collectors.groupingBy(
                        rp -> rp.getRole().getId(),
                        Collectors.mapping(
                                rp -> buildCode(
                                        rp.getPermission().getResource().toString(),
                                        rp.getPermission().getAction().toString()
                                ),
                                Collectors.toList()
                        )
                ));

        // map DTO
        List<RoleDTO> dtoList = roles.stream().map(role -> {
            RoleDTO dto = RoleMapper.toDTO(role);
            dto.setPermissionCodes(permissionMap.getOrDefault(role.getId(), List.of()));
            return dto;
        }).toList();

        return new PageImpl<>(dtoList, pageable, rolePage.getTotalElements());
    }

    public Long create(RoleRequest request) {
        if (repo.findByName(request.getName()).isPresent()) {
            throw new RuntimeException("Role already exists");
        }
        Role role = RoleMapper.toEntity(request);
        return repo.save(role).getId();
    }

    public void update(Long id, RoleRequest request) {
        Role role = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Role not found"));

        if (repo.findByName(request.getName()).isPresent()) {
            throw new RuntimeException("Role already exists");
        }

        RoleMapper.updateEntity(role, request);
        repo.save(role);
    }

    public void delete(Long id) {

        if (!repo.existsById(id)) {
            throw new RuntimeException("Role not found");
        }

        if (userRoleRepository.existsByRoleId(id)) {
            throw new RuntimeException("Không thể xóa role đang được gán cho user");
        }

        repo.deleteById(id);
    }

    private String buildCode(String resource, String action) {
        return resource.toLowerCase() + ":" + action.toLowerCase();
    }
}