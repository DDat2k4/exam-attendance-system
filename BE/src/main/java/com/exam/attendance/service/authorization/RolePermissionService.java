package com.exam.attendance.service;

import com.exam.attendance.data.entity.Permission;
import com.exam.attendance.data.entity.Role;
import com.exam.attendance.data.entity.RolePermission;
import com.exam.attendance.data.mapper.PermissionMapper;
import com.exam.attendance.data.pojo.PermissionDTO;
import com.exam.attendance.repository.PermissionRepository;
import com.exam.attendance.repository.RolePermissionRepository;
import com.exam.attendance.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RolePermissionService {

    private final RolePermissionRepository repo;
    private final RoleRepository roleRepo;
    private final PermissionRepository permRepo;

    public List<PermissionDTO> getPermissions(Long roleId) {
        return repo.findByRoleId(roleId).stream()
                .map(RolePermission::getPermission)
                .map(PermissionMapper::toDTO)
                .toList();
    }

    public void addPermissions(Long roleId, List<Long> ids) {
        Role role = roleRepo.findById(roleId).orElseThrow();

        List<RolePermission> list = ids.stream().map(pid -> {
            Permission p = permRepo.findById(pid).orElseThrow();
            RolePermission rp = new RolePermission();
            rp.setRole(role);
            rp.setPermission(p);
            return rp;
        }).toList();

        repo.saveAll(list);
    }

    public void replacePermissions(Long roleId, List<Long> ids) {
        repo.deleteByRoleId(roleId);
        addPermissions(roleId, ids);
    }

    public void removePermission(Long roleId, Long permissionId) {
        repo.deleteByRoleIdAndPermissionId(roleId, permissionId);
    }
}