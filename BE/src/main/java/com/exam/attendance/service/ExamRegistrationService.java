package com.exam.attendance.service;

import com.exam.attendance.data.entity.Exam;
import com.exam.attendance.data.entity.ExamRegistration;
import com.exam.attendance.data.entity.User;
import com.exam.attendance.data.mapper.ExamRegistrationMapper;
import com.exam.attendance.data.response.ExamRegistrationResponse;
import com.exam.attendance.repository.ExamRegistrationRepository;
import com.exam.attendance.repository.ExamRepository;
import com.exam.attendance.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExamRegistrationService {

    private final ExamRegistrationRepository registrationRepository;
    private final UserRepository userRepository;
    private final ExamRepository examRepository;

    // Add 1 user
    public ExamRegistration addUserToExam(Long userId, Long examId) {

        // check tồn tại
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new RuntimeException("Exam not found"));

        // check duplicate
        registrationRepository.findByExamIdAndUserId(examId, userId)
                .ifPresent(r -> {
                    throw new RuntimeException("User already in exam");
                });

        ExamRegistration registration = new ExamRegistration();
        registration.setUser(user);
        registration.setExam(exam);
        registration.setStatus((short) 1);  //ACTIVE
        registration.setRegisteredAt(LocalDateTime.now());

        return registrationRepository.save(registration);
    }

    // Admin add nhiều user
    public void addUsersToExam(List<Long> userIds, Long examId) {

        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new RuntimeException("Exam not found"));

        List<User> users = userRepository.findAllById(userIds);

        // lấy danh sách đã tồn tại 1 lần
        List<ExamRegistration> existing = registrationRepository
                .findByExamIdAndUserIdIn(examId, userIds);

        Set<Long> existingUserIds = existing.stream()
                .map(r -> r.getUser().getId())
                .collect(Collectors.toSet());

        List<ExamRegistration> registrations = users.stream()
                .filter(user -> !existingUserIds.contains(user.getId()))
                .map(user -> {
                    ExamRegistration r = new ExamRegistration();
                    r.setUser(user);
                    r.setExam(exam);
                    r.setStatus((short) 1); //ACTIVE
                    r.setRegisteredAt(LocalDateTime.now());
                    return r;
                })
                .toList();

        registrationRepository.saveAll(registrations);
    }

    // Xóa user khỏi exam
    public void removeUserFromExam(Long userId, Long examId) {
        ExamRegistration registration = registrationRepository
                .findByExamIdAndUserId(examId, userId)
                .orElseThrow(() -> new RuntimeException("Registration not found"));

        registrationRepository.delete(registration);
    }

    public ExamRegistrationResponse getById(Long id){
        ExamRegistration examRegistration = registrationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Registration not found"));
        return ExamRegistrationMapper.toResponse(examRegistration);
    };

    // Danh sách thí sinh
    public Page<ExamRegistration> getByExam(Long examId, Pageable pageable){
        return registrationRepository.findByExamId(examId, pageable);
    }

    public boolean isRegistered(Long userId, Long examId){
        return registrationRepository.existsByUserIdAndExamId(userId, examId);
    };

    public Page<ExamRegistration> getByUserId(Long userId, Pageable pageable) {
        return registrationRepository.findByUserId(userId, pageable);
    }
}
