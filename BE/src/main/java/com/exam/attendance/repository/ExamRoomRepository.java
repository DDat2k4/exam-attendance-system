package com.exam.attendance.repository;

import com.exam.attendance.data.entity.ExamRoom;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExamRoomRepository extends JpaRepository<ExamRoom, Long> {
    List<ExamRoom> findByExamId(Long examId);

    Page<ExamRoom> findByExamId(Long examId, Pageable pageable);

    Boolean existsByExamId(Long examId);
}