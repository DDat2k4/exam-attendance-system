package com.exam.attendance.service.security;

import com.exam.attendance.data.entity.Permission;
import com.exam.attendance.data.entity.User;
import com.exam.attendance.repository.UserRepository;
import com.exam.attendance.repository.UserRoleRepository;
import com.exam.attendance.security.CustomUserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;

    @Override
    public UserDetails loadUserByUsername(String username)
            throws UsernameNotFoundException {

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        Set<Permission> permissions =
                userRoleRepository.findPermissionsByUserId(user.getId());

        List<GrantedAuthority> authorities = new ArrayList<>();

        if (permissions != null) {
            authorities = permissions.stream()
                    .map(Permission::toAuthority)
                    .map(SimpleGrantedAuthority::new)
                    .map(GrantedAuthority.class::cast)
                    .toList();
        }

        return new CustomUserPrincipal(
                user.getId(),
                user.getUsername(),
                authorities,
                user.getActive() == 1
        );
    }
}