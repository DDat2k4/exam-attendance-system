package com.exam.attendance.config;

import com.exam.attendance.security.CustomUserPrincipal;
import com.exam.attendance.service.security.JwtService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.*;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    private static final String COOKIE_NAME = "ACCESS_TOKEN";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String token = extractToken(request);

        if (token == null) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            Long userId = jwtService.extractUserId(token);
            Claims claims = jwtService.parseClaims(token);

            if (SecurityContextHolder.getContext().getAuthentication() == null) {

                List<String> roles = claims.get("roles", List.class);
                List<String> perms = claims.get("permissions", List.class);

                Collection<GrantedAuthority> authorities = new ArrayList<>();

                if (roles != null) {
                    authorities.addAll(
                            roles.stream()
                                    .map(r -> new SimpleGrantedAuthority("ROLE_" + r))
                                    .toList()
                    );
                }

                if (perms != null) {
                    authorities.addAll(
                            perms.stream()
                                    .map(SimpleGrantedAuthority::new)
                                    .toList()
                    );
                }

                CustomUserPrincipal principal = new CustomUserPrincipal(
                        userId,
                        userId.toString(),
                        authorities,
                        true
                );

                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(
                                principal,
                                null,
                                authorities
                        );

                auth.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request)
                );

                SecurityContextHolder.getContext().setAuthentication(auth);
            }

        } catch (Exception ex) {
            // ignore token invalid
        }

        filterChain.doFilter(request, response);
    }

    private String extractToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }

        if (request.getCookies() != null) {
            return Arrays.stream(request.getCookies())
                    .filter(c -> COOKIE_NAME.equals(c.getName()))
                    .map(Cookie::getValue)
                    .findFirst()
                    .orElse(null);
        }

        return null;
    }
}