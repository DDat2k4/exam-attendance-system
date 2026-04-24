package com.exam.attendance.repository;

import com.exam.attendance.data.entity.ExamRegistration;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ExamRegistrationRepository extends JpaRepository<ExamRegistration, Long> {
    boolean existsByUserIdAndExamId(Long examId, Long userId);

    Optional<ExamRegistration> findByExamIdAndUserId(Long examId, Long userId);

    List<ExamRegistration> findByUserId(Long userId);

    Page<ExamRegistration> findByExamId(Long examId, Pageable pageable);

    List<ExamRegistration> findByExamIdAndUserIdIn(Long examId, List<Long> userIds);

    Page<ExamRegistration> findByUserId(Long userId, Pageable pageable);
}