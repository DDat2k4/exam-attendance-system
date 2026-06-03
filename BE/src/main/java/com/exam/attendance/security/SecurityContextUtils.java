package com.exam.attendance.security;

import com.exam.attendance.data.entity.User;
import com.exam.attendance.security.principal.CustomUserPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public class SecurityContextUtils {

    public static Long getCurrentUserId() {

        Authentication auth =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (auth == null || auth.getPrincipal() == null) {
            throw new RuntimeException("Unauthenticated");
        }
        if (auth.getPrincipal()
                instanceof CustomUserPrincipal principal) {
            return principal.getId();
        }
        throw new RuntimeException("Invalid principal type");
    }

    public static CustomUserPrincipal getCurrentPrincipal() {

        Authentication auth =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (auth == null || auth.getPrincipal() == null) {
            throw new RuntimeException("Unauthenticated");
        }

        if (auth.getPrincipal() instanceof CustomUserPrincipal principal) {
            return principal;
        }
        throw new RuntimeException("Invalid principal type");
    }

    public static User getCurrentUser() {
        CustomUserPrincipal principal = getCurrentPrincipal();
        return principal.getUser();
    }
}