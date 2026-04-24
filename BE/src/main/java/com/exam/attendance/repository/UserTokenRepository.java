package com.exam.attendance.repository;

import com.exam.attendance.data.entity.UserToken;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.transaction.Transactional;

import java.util.List;
import java.util.Optional;

public interface UserTokenRepository extends JpaRepository<UserToken, Long> {

    // Lấy tất cả token còn hiệu lực
    @Query("""
        SELECT t
        FROM UserToken t
        WHERE t.user.id = :userId
        AND t.revoked = false
        AND t.expiresAt > CURRENT_TIMESTAMP
    """)
    List<UserToken> findActiveTokensByUserId(@Param("userId") Long userId);

    Optional<UserToken> findByRefreshTokenAndRevokedFalse(String refreshToken);

    // Revoke tất cả token
    @Modifying
    @Transactional
    @Query("""
        UPDATE UserToken t
        SET t.revoked = true
        WHERE t.user.id = :userId
        AND t.revoked = false
    """)
    void revokeAllTokensByUserId(@Param("userId") Long userId);
}