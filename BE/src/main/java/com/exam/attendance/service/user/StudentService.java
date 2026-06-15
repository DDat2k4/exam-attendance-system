package com.exam.attendance.service.user;

import com.exam.attendance.data.entity.*;
import com.exam.attendance.data.request.StudentCreateRequest;
import com.exam.attendance.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;

@Service
@RequiredArgsConstructor
public class StudentService {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final CitizenCardRepository citizenCardRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public Long createStudent(StudentCreateRequest request) {

        validate(request);

        User user = createUser(request);
        createUserRole(user);
        createUserProfile(user, request);
        createCitizenCard(user, request);

        return user.getId();
    }

    // -------------------------------------------------------------------------

    private void validate(StudentCreateRequest request) {

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username đã tồn tại");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email đã tồn tại");
        }

        if (citizenCardRepository.existsByCitizenId(request.getCitizenId())) {
            throw new RuntimeException("CCCD đã tồn tại");
        }
    }

    private User createUser(StudentCreateRequest request) {

        User user = new User();

        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setActive((short) 1);
        user.setRoles(new ArrayList<>());

        return userRepository.save(user);
    }

    private void createUserRole(User user) {

        Role role = roleRepository.findByName("STUDENT")
                .orElseThrow(() ->
                        new RuntimeException("Role STUDENT không tồn tại")
                );

        UserRole userRole = new UserRole();
        userRole.setUser(user);
        userRole.setRole(role);

        user.getRoles().add(userRole);
    }

    private void createUserProfile(User user, StudentCreateRequest request) {

        UserProfile profile = new UserProfile();

        profile.setUser(user);
        profile.setName(request.getFullName());
        profile.setCitizenId(request.getCitizenId());
        profile.setBirthDate(request.getBirthDate());
        profile.setGender(request.getGender());

        userProfileRepository.save(profile);
    }

    private void createCitizenCard(User user, StudentCreateRequest request) {

        CitizenCard card = new CitizenCard();

        card.setUser(user);
        card.setCitizenId(request.getCitizenId());
        card.setFullName(request.getFullName());
        card.setBirthDate(request.getBirthDate());

        citizenCardRepository.save(card);
    }
}
