package com.exam.attendance.config.sso;

import com.exam.attendance.data.entity.User;
import com.exam.attendance.data.entity.UserProfile;
import com.exam.attendance.data.entity.UserToken;
import com.exam.attendance.data.pojo.UserDTO;
import com.exam.attendance.data.response.AuthResponse;
import com.exam.attendance.repository.UserProfileRepository;
import com.exam.attendance.repository.UserRepository;
import com.exam.attendance.repository.UserTokenRepository;
import com.exam.attendance.service.security.JwtService;
import com.exam.attendance.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2LoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final UserService userService;
    private final UserTokenRepository userTokenRepository;
    private final JwtService jwtService;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication)
            throws IOException, ServletException {

        if (authentication == null || !(authentication.getPrincipal() instanceof OidcUser oidcUser)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        String email = oidcUser.getEmail();
        String providerId = oidcUser.getSubject();
        String provider = detectProvider(oidcUser);

        log.info("OAuth2 login success: {} via {}", email, provider);

        User user = userRepository.findByEmail(email)
                .orElseGet(() -> {
                    User u = new User();
                    u.setEmail(email);
                    u.setUsername(email);
                    u.setProvider(provider);
                    u.setProviderId(providerId);
                    return userRepository.save(u);
                });

        UserProfile profile = userProfileRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    UserProfile p = new UserProfile();
                    p.setUser(user);
                    return p;
                });

        profile.setName(email);
        userProfileRepository.save(profile);

        UserDTO detail = userService.getUserById(user.getId());

        Set<String> roles = detail.getRoles() != null
                ? new HashSet<>(detail.getRoles())
                : new HashSet<>();

        Set<String> permissions = detail.getPermissions() != null
                ? new HashSet<>(detail.getPermissions())
                : new HashSet<>();

        String accessToken = jwtService.generateToken(user.getId(), roles, permissions);
        String refreshToken = jwtService.generateRefreshToken(user.getId());

        UserToken userToken = new UserToken();
        userToken.setUser(user);
        userToken.setRefreshToken(refreshToken);
        userToken.setCreatedAt(LocalDateTime.now());
        userToken.setExpiresAt(LocalDateTime.now().plusDays(7));
        userToken.setRevoked(false);
        userTokenRepository.save(userToken);

        AuthResponse authResponse = new AuthResponse();
        authResponse.setUserId(user.getId());
        authResponse.setUserName(user.getUsername());
        authResponse.setEmail(email);
        authResponse.setProvider(provider);
        authResponse.setAccessToken(accessToken);
        authResponse.setRefreshToken(refreshToken);
        authResponse.setRoles(roles);
        authResponse.setPermissions(permissions);

        response.setContentType("application/json;charset=UTF-8");
        response.setStatus(HttpServletResponse.SC_OK);
        new ObjectMapper().writeValue(response.getWriter(), authResponse);
    }

     // Detect provider theo attribute phổ biến
    private String detectProvider(OidcUser oidcUser) {
        if (oidcUser.getAttributes().containsKey("sub")) return "google";
        if (oidcUser.getAttributes().containsKey("id")) return "facebook";
        return "unknown";
    }
}
