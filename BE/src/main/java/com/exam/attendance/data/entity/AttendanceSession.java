package com.exam.attendance.data.entity;

import com.exam.attendance.data.pojo.enums.AttendanceStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "attendance_sessions")
public class AttendanceSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "checkin_time")
    private LocalDateTime checkinTime;

    @Column(name = "attendance_photo")
    private String attendancePhoto;

    @Enumerated(EnumType.STRING)
    private AttendanceStatus status;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_session_id")
    private ExamSession examSession;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "verified_by")
    private User verifiedBy;
}