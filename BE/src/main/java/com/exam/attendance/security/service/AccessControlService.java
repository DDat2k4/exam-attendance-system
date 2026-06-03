package com.exam.attendance.security.service;

import com.exam.attendance.data.enums.Action;
import com.exam.attendance.data.enums.Resource;
import org.springframework.security.core.Authentication;

public interface AccessControlService {

    // check basic RBAC
    void checkPermission(Authentication auth, Resource resource, Action action);

    boolean hasPermission(Authentication auth, Resource resource, Action action);

    // check theo entity
    void checkPermission(Authentication auth,
                         Resource resource,
                         Action action,
                         Long ownerId,
                         Long currentUserId);

    boolean hasPermission(Authentication auth,
                          Resource resource,
                          Action action,
                          Long ownerId,
                          Long currentUserId);


}