package com.exam.attendance.repository;

import com.exam.attendance.data.entity.UserRole;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.transaction.Transactional;

import java.util.Set;
import java.util.List;

@Repository
public interface UserRoleRepository extends JpaRepository<UserRole, Long> {

    // Lấy roles của user
    @Query("""
        SELECT r.name
        FROM UserRole ur
        JOIN ur.role r
        WHERE ur.user.id = :userId
    """)
    Set<String> findRolesByUserId(@Param("userId") Long userId);

    // Lấy permissions của user
    @Query("""
        SELECT DISTINCT p.code
        FROM UserRole ur
        JOIN ur.role r
        JOIN RolePermission rp ON rp.role.id = r.id
        JOIN rp.permission p
        WHERE ur.user.id = :userId
    """)
    Set<String> findPermissionsByUserId(@Param("userId") Long userId);

    // Xóa role của user
    @Modifying
    @Transactional
    void deleteByUserId(Long userId);

    // Lấy toàn bộ role object
    List<UserRole> findByUserId(Long userId);

    void deleteByUserIdAndRoleId(Long userId, Long roleId);

    boolean existsByRoleId(Long roleId);
}
