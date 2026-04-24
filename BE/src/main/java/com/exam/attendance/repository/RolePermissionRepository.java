package com.exam.attendance.repository;

import com.exam.attendance.data.entity.RolePermission;
import com.exam.attendance.data.entity.Permission;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface RolePermissionRepository extends JpaRepository<RolePermission, Long> {

    // Lấy tất cả permission của role
    @Query("""
        SELECT p
        FROM RolePermission rp
        JOIN rp.permission p
        WHERE rp.role.id = :roleId
    """)
    List<Permission> findPermissionsByRoleId(@Param("roleId") Long roleId);

    // Lấy toàn bộ role_permission
    @Query("""
    select rp from RolePermission rp
    join fetch rp.permission
    where rp.role.id = :roleId
""")
    List<RolePermission> findByRoleId(@Param("roleId") Long roleId);

    // Xóa tất cả permission của role
    @Modifying
    @Transactional
    @Query("delete from RolePermission rp where rp.role.id = :roleId")
    int deleteByRoleId(@Param("roleId") Long roleId);

    void deleteByRoleIdAndPermissionId(Long roleId, Long permissionId);

    @Query("""
    SELECT rp FROM RolePermission rp
    JOIN FETCH rp.permission
    WHERE rp.role.id IN :roleIds
""")
    List<RolePermission> findByRoleIds(@Param("roleIds") List<Long> roleIds);

    boolean existsByPermissionId(Long permissionId);
}