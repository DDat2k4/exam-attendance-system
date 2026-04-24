package com.exam.attendance.service;

import com.exam.attendance.data.entity.*;
import com.exam.attendance.data.pojo.UserDTO;
import com.exam.attendance.repository.*;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final UserRoleRepository userRoleRepository;
    private final UserTokenRepository userTokenRepository;
    private final PasswordEncoder passwordEncoder;

    private User getUserOrThrow(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + id));
    }

    private UserDTO buildUserDTO(User user) {

        Long userId = user.getId();

        Optional<UserProfile> profile = userProfileRepository.findByUserId(userId);

        Set<String> roles = new HashSet<>(userRoleRepository.findRolesByUserId(userId));

        Set<String> permissions = Optional
                .ofNullable(userRoleRepository.findPermissionsByUserId(userId))
                .orElse(Collections.emptySet());

        List<String> tokens = userTokenRepository.findActiveTokensByUserId(userId)
                .stream()
                .map(UserToken::getRefreshToken)
                .toList();

        return UserDTO.builder()
                .id(userId)
                .username(user.getUsername())
                .email(user.getEmail())
                .phone(user.getPhone())
                .lastLogin(user.getLastLogin())
                .name(profile.map(UserProfile::getName).orElse(null))
                .active(user.getActive())
                .roles(roles)
                .permissions(permissions)
                .activeTokens(tokens)
                .build();
    }

    @Transactional(readOnly = true)
    public UserDTO getUserById(Long id) {

        return buildUserDTO(getUserOrThrow(id));
    }

    @Transactional(readOnly = true)
    public Page<UserDTO> getUsersByRole(String role, Pageable pageable) {

        Page<User> users = (role == null || role.isBlank())
                ? userRepository.findAll(pageable)
                : userRepository.findByRole(role, pageable);

        return users.map(this::buildUserDTO);
    }

    public Long createUser(String username, String email, String phone, String password) {

        if (userRepository.existsByUsername(username))
            throw new IllegalArgumentException("Username already exists");

        if (userRepository.existsByEmail(email))
            throw new IllegalArgumentException("Email already exists");

        User user = new User();

        user.setUsername(username);
        user.setEmail(email);
        user.setPhone(phone);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setActive((short) 1);
        user.setCreatedAt(LocalDateTime.now());

        userRepository.save(user);

        return user.getId();
    }

    public void updateUser(Long id, String email, String password, Short active) {

        User user = getUserOrThrow(id);

        if (email != null)
            user.setEmail(email);

        if (password != null)
            user.setPasswordHash(passwordEncoder.encode(password));

        if (active != null)
            user.setActive(active);

        userRepository.save(user);
    }

    private void updateStatus(Long id, short status) {

        User user = getUserOrThrow(id);
        user.setActive(status);

        userRepository.save(user);
    }

    public void activateUser(Long id) {
        updateStatus(id, (short) 1);
    }

    public void deactivateUser(Long id) {
        updateStatus(id, (short) 0);
    }

    public void deleteUser(Long id) {
        updateStatus(id, (short) -1);
    }

    public void lockUser(Long id, LocalDateTime until) {

        User user = getUserOrThrow(id);
        user.setLockedUntil(until);

        userRepository.save(user);
    }

    public void unlockUser(Long id) {

        User user = getUserOrThrow(id);
        user.setLockedUntil(null);

        userRepository.save(user);
    }

    public void resetFailedAttempts(Long id) {

        User user = getUserOrThrow(id);
        user.setFailedAttempts(0);

        userRepository.save(user);
    }

    public void increaseFailedAttempts(Long id) {

        User user = getUserOrThrow(id);

        int attempts = Optional.ofNullable(user.getFailedAttempts()).orElse(0);

        user.setFailedAttempts(attempts + 1);

        userRepository.save(user);
    }

    public User getByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public User getByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public User findByCitizenId(String citizenId) {
        return userRepository.findByCitizenCardCitizenId(citizenId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sinh viên"));
    }
}