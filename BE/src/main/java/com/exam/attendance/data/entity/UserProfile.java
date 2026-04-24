package com.exam.attendance.data.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "user_profiles")
public class UserProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    // Thông tin cơ bản
    private String name;

    /**
     * 1: Nam
     * 2: Nữ
     * 0: Khác
     */
    private Short gender;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    // Thông tin xác thực
    @Column(name = "citizen_id", unique = true, length = 12)
    private String citizenId;
    /**
     * Trạng thái đã xác thực CCCD hay chưa
     */
    private Boolean isVerified = false;

    /**
     * Thời điểm xác thực CCCD
     */
    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @PrePersist
    public void prePersist() {
        if (isVerified == null) {
            isVerified = false;
        }
    }
}