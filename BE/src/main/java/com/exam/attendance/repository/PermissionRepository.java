package com.exam.attendance.repository;

import com.exam.attendance.data.entity.Permission;
import com.exam.attendance.data.enums.Action;
import com.exam.attendance.data.enums.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PermissionRepository extends JpaRepository<Permission, Long> {

    boolean existsByResourceAndAction(Resource resource, Action action);

    Page<Permission> findByResource(Resource resource, Pageable pageable);
}


