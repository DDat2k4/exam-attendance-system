package com.exam.attendance.service.sso;

import com.exam.attendance.data.entity.User;
import com.exam.attendance.data.entity.UserProfile;
import com.exam.attendance.data.pojo.UserDTO;
import com.exam.attendance.data.response.AuthResponse;
import com.exam.attendance.repository.UserProfileRepository;
import com.exam.attendance.repository.UserRepository;
import com.exam.attendance.service.UserService;
import com.exam.attendance.service.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.HashSet;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final UserService userService;
    private final JwtService jwtService;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException, ServletException {
        log.info("OAuth2 login success: {}", authentication.getName());

        Object principal = authentication.getPrincipal();
        if (!(principal instanceof OAuth2User oauth2User)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        String email = oauth2User.getAttribute("email");
        String username = oauth2User.getAttribute("name"); // lấy tên hiển thị từ Google/Facebook
        String avatar = oauth2User.getAttribute("picture"); // Google/Facebook avatar URL
        String provider = detectProvider(oauth2User);

        if (email == null) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        // Lấy hoặc tạo User
        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User newUser = new User();
            newUser.setUsername(username);
            newUser.setEmail(email);
            newUser = userRepository.save(newUser);

            // Tạo profile
            UserProfile profile = new UserProfile();
            profile.setUser(newUser);
            profile.setName(username);
            userProfileRepository.save(profile);

            return newUser;
        });

        // Nếu đã có profile, update avatar/name
        userProfileRepository.findByUserId(user.getId()).ifPresent(profile -> {
            profile.setName(username);
            userProfileRepository.save(profile);
        });

        // Lấy roles + permissions từ UserService
        Long id = user.getId();
        UserDTO detail = userService.getUserById(id);

        Set<String> roles = detail.getRoles() != null
                ? new HashSet<>(detail.getRoles())
                : new HashSet<>();

        Set<String> permissions = detail.getPermissions() != null
                ? new HashSet<>(detail.getPermissions())
                : new HashSet<>();

        // Sinh token
        String accessToken = jwtService.generateToken(user.getUsername(), roles, permissions);
        String refreshToken = jwtService.generateRefreshToken(user.getUsername());

        // Trả về response
        AuthResponse authResponse = new AuthResponse();
        authResponse.setUserId(id);
        authResponse.setUserName(username);
        authResponse.setEmail(email);
        authResponse.setProvider(provider);
        authResponse.setAccessToken(accessToken);
        authResponse.setRefreshToken(refreshToken);
        authResponse.setRoles(roles);
        authResponse.setPermissions(permissions);

        response.setContentType("application/json;charset=UTF-8");
        response.setStatus(HttpServletResponse.SC_OK);
        objectMapper.writeValue(response.getWriter(), authResponse);
    }

    private String detectProvider(OAuth2User user) {
        if (user.getAttributes().containsKey("sub")) return "google";
        if (user.getAttributes().containsKey("id")) return "facebook";
        return "unknown";
    }
}
