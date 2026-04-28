package com.exam.attendance.data.entity;

import com.exam.attendance.data.pojo.enums.ExamSessionStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "exam_sessions")
public class ExamSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_start")
    private LocalDateTime sessionStart;

    @Column(name = "session_end")
    private LocalDateTime sessionEnd;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private ExamSessionStatus status;

    // đánh dấu gian lận
    @Column(name = "is_flagged")
    private Boolean isFlagged = false;
    @Column(name = "device_id")
    private String deviceId;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id")
    private Exam exam;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    private ExamRoom room;

    @OneToMany(mappedBy = "examSession", fetch = FetchType.LAZY)
    private List<AttendanceSession> attendanceSessions;

    @OneToMany(mappedBy = "examSession", fetch = FetchType.LAZY)
    private List<IdentityVerification> identityVerifications;
}