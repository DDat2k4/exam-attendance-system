package com.exam.attendance.repository;

import com.exam.attendance.data.entity.ExamRegistration;
import com.exam.attendance.data.pojo.RoomStudentDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ExamRegistrationRepository extends JpaRepository<ExamRegistration, Long> {
    boolean existsByUserIdAndExamId(Long examId, Long userId);

    Optional<ExamRegistration> findByExamIdAndUserId(Long examId, Long userId);

    List<ExamRegistration> findByUserId(Long userId);

    Page<ExamRegistration> findByExamId(Long examId, Pageable pageable);

    List<ExamRegistration> findByExamIdAndUserIdIn(Long examId, List<Long> userIds);

    Page<ExamRegistration> findByUserId(Long userId, Pageable pageable);

    long countByRoomId(Long roomId);

    boolean existsByRoomIdAndSeatNumber(Long roomId, Integer seatNumber);

    boolean existsByRoomId(Long roomId);

    Optional<ExamRegistration> findByUserIdAndExam_StartTimeBeforeAndExam_EndTimeAfter(
            Long userId,
            LocalDateTime now1,
            LocalDateTime now2
    );

    @Query("""
    SELECT new com.exam.attendance.data.pojo.RoomStudentDTO(
        r.id,
        u.id,
        u.username,
        p.name,
        c.citizenId,
        r.seatNumber
    )
    FROM ExamRegistration r
    JOIN r.user u
    LEFT JOIN u.userProfile p
    LEFT JOIN u.citizenCard c
    WHERE r.room.id = :roomId
    ORDER BY r.seatNumber ASC
""")
    Page<RoomStudentDTO> findStudentsByRoom(
            @Param("roomId") Long roomId,
            Pageable pageable
    );

    @Query("""
    SELECT r.seatNumber
    FROM ExamRegistration r
    WHERE r.room.id = :roomId
""")
    List<Integer> findSeatNumbersByRoomId(@Param("roomId") Long roomId);
}