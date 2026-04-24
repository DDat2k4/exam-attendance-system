package com.exam.attendance.service;

import com.exam.attendance.data.entity.Role;
import com.exam.attendance.data.entity.User;
import com.exam.attendance.data.entity.UserRole;
import com.exam.attendance.data.mapper.RoleMapper;
import com.exam.attendance.data.pojo.RoleDTO;
import com.exam.attendance.repository.RoleRepository;
import com.exam.attendance.repository.UserRepository;
import com.exam.attendance.repository.UserRoleRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserRoleService {

    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;

    public List<RoleDTO> getRolesByUserId(Long userId) {
        return userRoleRepository.findByUserId(userId)
                .stream()
                .map(UserRole::getRole)
                .map(RoleMapper::toDTO)
                .toList();
    }

    @Transactional
    public void addRolesToUser(Long userId, List<Long> roleIds) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<UserRole> list = roleIds.stream().map(roleId -> {
            Role role = roleRepository.findById(roleId)
                    .orElseThrow(() -> new RuntimeException("Role not found"));

            UserRole ur = new UserRole();
            ur.setUser(user);
            ur.setRole(role);
            return ur;
        }).toList();

        userRoleRepository.saveAll(list);
    }

    @Transactional
    public void replaceUserRoles(Long userId, List<Long> roleIds) {

        userRoleRepository.deleteByUserId(userId);
        addRolesToUser(userId, roleIds);
    }

    @Transactional
    public void removeRoleFromUser(Long userId, Long roleId) {

        userRoleRepository.deleteByUserIdAndRoleId(userId, roleId);
    }
}