package com.exam.attendance.repository;

import com.exam.attendance.data.entity.Permission;
import com.exam.attendance.data.pojo.enums.Action;
import com.exam.attendance.data.pojo.enums.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PermissionRepository extends JpaRepository<Permission, Long> {

    boolean existsByResourceAndAction(Resource resource, Action action);

    Optional<Permission> findByResourceAndAction(Resource resource, String action);

    Page<Permission> findByResource(Resource resource, Pageable pageable);
}


