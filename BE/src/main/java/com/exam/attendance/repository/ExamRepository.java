package com.exam.attendance.repository;

import com.exam.attendance.data.entity.Exam;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ExamRepository extends JpaRepository<Exam, Long> {

    // pagination
    Page<Exam> findAll(Pageable pageable);

    // search
    Page<Exam> findByTitleContainingIgnoreCase(
            String title,
            Pageable pageable
    );

    // detail
    @Query("""
    SELECT DISTINCT e 
    FROM Exam e
    LEFT JOIN FETCH e.createdBy
    LEFT JOIN FETCH e.rooms
    WHERE e.id = :id
    """)
    Optional<Exam> findDetailById(Long id);
}
