package com.exam.attendance.repository;

import com.exam.attendance.data.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RoleRepository extends JpaRepository<Role, Long> {

    Optional<Role> findByName(String name);

    @Query("""
    SELECT r FROM Role r
    WHERE (:name IS NULL OR LOWER(r.name) LIKE LOWER(CONCAT('%', CAST(:name AS string), '%')))
""")
    Page<Role> search(@Param("name") String name, Pageable pageable);
}

