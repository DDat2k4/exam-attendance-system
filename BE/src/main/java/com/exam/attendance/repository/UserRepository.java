package com.exam.attendance.repository;

import com.exam.attendance.data.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {


    // Find methods
    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    Optional<User> findByPhone(String phone);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    // Find users by role (RBAC)
    @Query("""
        SELECT u
        FROM User u
        JOIN UserRole ur ON ur.user.id = u.id
        JOIN Role r ON ur.role.id = r.id
        WHERE r.name = :role
    """)
    Page<User> findByRole(@Param("role") String role, Pageable pageable);

    // Search users
    @Query("""
    SELECT DISTINCT u
    FROM User u
    LEFT JOIN UserProfile p ON p.user.id = u.id
    LEFT JOIN UserRole ur ON ur.user.id = u.id
    LEFT JOIN Role r ON r.id = ur.role.id
    WHERE (:id IS NULL OR u.id = :id)
    AND (:username IS NULL OR LOWER(u.username) LIKE LOWER(CONCAT('%', :username, '%')))
    AND (:email IS NULL OR LOWER(u.email) LIKE LOWER(CONCAT('%', :email, '%')))
    AND (:phone IS NULL OR u.phone LIKE CONCAT('%', :phone, '%'))
    AND (:role IS NULL OR r.name = :role)
    AND (:active IS NULL OR u.active = :active)
    AND (:name IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :name, '%')))
    """)
    Page<User> searchUsers(
            @Param("id") Long id,
            @Param("username") String username,
            @Param("email") String email,
            @Param("phone") String phone,
            @Param("role") String role,
            @Param("active") Short active,
            @Param("name") String name,
            Pageable pageable
    );

    // Login security
    @Modifying
    @Query("""
        UPDATE User u 
        SET u.failedAttempts = u.failedAttempts + 1
        WHERE u.id = :userId
    """)
    void increaseFailedAttempts(@Param("userId") Long userId);


    @Modifying
    @Query("""
        UPDATE User u 
        SET u.failedAttempts = 0
        WHERE u.id = :userId
    """)
    void resetFailedAttempts(@Param("userId") Long userId);


    @Modifying
    @Query("""
        UPDATE User u 
        SET u.lockedUntil = :lockTime
        WHERE u.id = :userId
    """)
    void lockUser(
            @Param("userId") Long userId,
            @Param("lockTime") LocalDateTime lockTime
    );

    Optional<User> findByCitizenCardCitizenId(String citizenId);
}