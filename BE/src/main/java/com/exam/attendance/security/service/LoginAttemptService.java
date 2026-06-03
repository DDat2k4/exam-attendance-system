package com.exam.attendance.security.service;

import com.exam.attendance.config.properties.AuthProperties;
import com.exam.attendance.data.entity.User;
import com.exam.attendance.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class LoginAttemptService {

    private final UserRepository userRepository;
    private final AuthProperties authProperties;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    protected boolean handleFailedAttempt(User user, String username) {

        user.setFailedAttempts(user.getFailedAttempts() + 1);

        boolean locked = false;

        if (user.getFailedAttempts() >= authProperties.getMaxFailedAttempts()) {

            user.setLockedUntil(
                    LocalDateTime.now()
                            .plusMinutes(authProperties.getLockDurationMinutes()));

            user.setFailedAttempts(0);

            locked = true;
        }

        userRepository.save(user);

        return locked;
    }
}