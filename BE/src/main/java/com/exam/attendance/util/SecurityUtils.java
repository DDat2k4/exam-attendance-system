package com.exam.attendance.util;

import com.exam.attendance.security.CustomUserPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public class SecurityUtils {

    public static Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null || auth.getPrincipal() == null) {
            throw new RuntimeException("Unauthenticated");
        }

        if (auth.getPrincipal() instanceof CustomUserPrincipal principal) {
            return principal.getId();
        }

        throw new RuntimeException("Invalid principal type");
    }
}