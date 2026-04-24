package com.exam.attendance.service.sso;

import com.exam.attendance.data.entity.User;
import com.exam.attendance.data.entity.UserToken;
import com.exam.attendance.data.pojo.UserDTO;
import com.exam.attendance.data.response.UserDetailResponse;
import com.exam.attendance.data.mapper.UserMapper;
import com.exam.attendance.repository.UserRepository;
import com.exam.attendance.repository.UserTokenRepository;
import com.exam.attendance.service.JwtService;
import com.exam.attendance.service.UserService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    private final UserRepository userRepository;
    private final UserTokenRepository userTokenRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final UserService userService;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oauth2User = new DefaultOAuth2UserService().loadUser(userRequest);

        String email = (String) oauth2User.getAttributes().get("email");
        String tmpUsername = email != null ? email : "fb-" + oauth2User.getAttributes().get("id");

        // provision local user
        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User u = new User();
            u.setUid(UUID.randomUUID());
            u.setUsername(tmpUsername);
            u.setEmail(email);
            u.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
            u.setActive((short) 1);
            u.setCreatedAt(LocalDateTime.now());
            u.setFailedAttempts(0);
            return userRepository.save(u);
        });

        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        // revoke old tokens
        userTokenRepository.findActiveTokensByUserId(user.getId()).forEach(t -> {
            t.setRevoked(true);
            userTokenRepository.save(t);
        });

        // Lấy roles + permissions qua UserService + UserMapper
        UserDTO dto = userService.getUserById(user.getId());
        UserDetailResponse userDetail = UserMapper.toResponse(dto);

        // issue new tokens
        String accessToken = jwtService.generateToken(
                user.getUsername(),
                userDetail.getRoles(),
                userDetail.getPermissions()
        );
        String refreshToken = jwtService.generateRefreshToken(user.getUsername());

        UserToken ut = new UserToken();
        ut.setUser(user);
        ut.setRefreshToken(refreshToken);
        ut.setCreatedAt(LocalDateTime.now());
        ut.setExpiresAt(LocalDateTime.now().plusDays(7));
        ut.setRevoked(false);
        userTokenRepository.save(ut);

        // attach local tokens + roles/permissions
        Map<String, Object> attrs = new HashMap<>(oauth2User.getAttributes());
        attrs.put("localAccessToken", accessToken);
        attrs.put("localRefreshToken", refreshToken);
        attrs.put("localUsername", user.getUsername());
        attrs.put("roles", userDetail.getRoles());
        attrs.put("permissions", userDetail.getPermissions());

        return new DefaultOAuth2User(oauth2User.getAuthorities(), attrs, "id");
    }
}

