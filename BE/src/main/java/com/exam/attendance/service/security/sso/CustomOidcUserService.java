package com.exam.attendance.service.security.sso;

import com.exam.attendance.data.entity.User;
import com.exam.attendance.data.entity.UserToken;
import com.exam.attendance.data.mapper.UserMapper;
import com.exam.attendance.repository.UserRepository;
import com.exam.attendance.repository.UserTokenRepository;
import com.exam.attendance.service.security.JwtService;
import com.exam.attendance.service.UserService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class CustomOidcUserService extends OidcUserService {

    private final UserRepository userRepository;
    private final UserTokenRepository userTokenRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final UserService userService;

    @Override
    @Transactional
    public OidcUser loadUser(OidcUserRequest userRequest) throws OAuth2AuthenticationException {
        OidcUser oidcUser = super.loadUser(userRequest);

        String email = oidcUser.getEmail();
        String username = (email != null) ? email : Optional.ofNullable(oidcUser.getSubject())
                .orElse("user-" + UUID.randomUUID());

        // Tìm hoặc tạo user mới
        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User u = new User();
            u.setUid(UUID.randomUUID());
            u.setUsername(username);
            u.setEmail(email);
            u.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
            u.setActive((short) 1);
            u.setCreatedAt(LocalDateTime.now());
            u.setFailedAttempts(0);
            return userRepository.save(u);
        });

        // update last login
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        // revoke all old tokens
        userTokenRepository.revokeAllTokensByUserId(user.getId());

        // Lấy roles + permissions
        var dto = userService.getUserById(user.getId());
        var userDetail = UserMapper.toResponse(dto);

        // issue new tokens
        String accessToken = jwtService.generateToken(
                user.getUsername(),
                userDetail.getRoles(),
                userDetail.getPermissions()
        );
        String refreshToken = jwtService.generateRefreshToken(user.getUsername());

        UserToken token = new UserToken();
        token.setUser(user);
        token.setRefreshToken(refreshToken);
        token.setCreatedAt(LocalDateTime.now());
        token.setExpiresAt(LocalDateTime.now().plusDays(7));
        token.setRevoked(false);
        userTokenRepository.save(token);

        // attach attrs
        Map<String, Object> attrs = new HashMap<>(oidcUser.getAttributes());
        attrs.put("localAccessToken", accessToken);
        attrs.put("localRefreshToken", refreshToken);
        attrs.put("localUsername", user.getUsername());
        attrs.put("roles", userDetail.getRoles());
        attrs.put("permissions", userDetail.getPermissions());

        return new DefaultOidcUser(
                oidcUser.getAuthorities(),
                oidcUser.getIdToken(),
                oidcUser.getUserInfo(),
                "email"
        ) {
            @Override
            public Map<String, Object> getAttributes() {
                return Collections.unmodifiableMap(attrs);
            }
        };
    }
}
