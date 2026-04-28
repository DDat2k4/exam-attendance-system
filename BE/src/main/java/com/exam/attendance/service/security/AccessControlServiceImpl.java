package com.exam.attendance.service.security;

import com.exam.attendance.data.pojo.enums.Action;
import com.exam.attendance.data.pojo.enums.Resource;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AccessControlServiceImpl implements AccessControlService {

    @Override
    public void checkPermission(Authentication auth, Resource resource, Action action) {
        if (!hasPermission(auth, resource, action)) {
            throw new AccessDeniedException(buildCode(resource, action));
        }
    }

    @Override
    public boolean hasPermission(Authentication auth, Resource resource, Action action) {
        String required = buildCode(resource, action);

        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals(required));
    }

    @Override
    public void checkPermission(Authentication auth,
                                Resource resource,
                                Action action,
                                Long ownerId,
                                Long currentUserId) {

        // check RBAC trước
        checkPermission(auth, resource, action);

        // check owner
        if (ownerId != null && !ownerId.equals(currentUserId)) {
            throw new AccessDeniedException("Not owner");
        }
    }

    @Override
    public boolean hasPermission(Authentication auth,
                                 Resource resource,
                                 Action action,
                                 Long ownerId,
                                 Long currentUserId) {

        if (!hasPermission(auth, resource, action)) {
            return false;
        }

        return ownerId == null || ownerId.equals(currentUserId);
    }

    private String buildCode(Resource resource, Action action) {
        return resource.name().toLowerCase() + ":" + action.name().toLowerCase();
    }
}
