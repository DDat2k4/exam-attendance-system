package com.exam.attendance.repository;

import com.exam.attendance.data.entity.CitizenCard;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CitizenCardRepository extends JpaRepository<CitizenCard, Long> {
    Optional<CitizenCard> findByUserId(Long userId);
    Optional<CitizenCard> findByCitizenId(String citizenId);
}