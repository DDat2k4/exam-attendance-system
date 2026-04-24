package com.exam.attendance.data.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "citizen_cards")
public class CitizenCard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "citizen_id", unique = true)
    private String citizenId;

    @Column(name = "full_name")
    private String fullName;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(name = "expiry")
    private LocalDate expiry;

    // URL ảnh trên Cloudinary
    @Column(name = "face_image_url")
    private String faceImageUrl;

    // dùng để xóa/update ảnh trên Cloudinary
    @Column(name = "face_image_public_id")
    private String faceImagePublicId;

    @Column(name = "face_embedding", columnDefinition = "TEXT")
    private String faceEmbedding;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true)
    private User user;
}