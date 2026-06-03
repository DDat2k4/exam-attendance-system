package com.exam.attendance.repository;

import com.exam.attendance.data.entity.Exam;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ExamRepository extends JpaRepository<Exam, Long> {

    // pagination
    Page<Exam> findAll(Pageable pageable);

@Query("""
SELECT e
FROM Exam e
WHERE
    LOWER(e.title)
        LIKE LOWER(CONCAT('%', :keyword, '%'))
    OR LOWER(e.examCode)
        LIKE LOWER(CONCAT('%', :keyword, '%'))
    OR LOWER(e.semester)
        LIKE LOWER(CONCAT('%', :keyword, '%'))
""")
Page<Exam> search(
        @Param("keyword") String keyword,
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

    boolean existsByExamCodeAndSemester(
            String examCode,
            String semester
    );

    boolean existsByExamCodeAndSemesterAndIdNot(
            String examCode,
            String semester,
            Long id
    );
}
