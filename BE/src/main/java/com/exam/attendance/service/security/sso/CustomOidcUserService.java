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
    public OidcUser loadUser(OidcUserRequest userRequest)
            throws OAuth2AuthenticationException {

        OidcUser oidcUser = super.loadUser(userRequest);

        String email = oidcUser.getEmail();
        String providerId = oidcUser.getSubject();
        String provider = userRequest.getClientRegistration()
                .getRegistrationId();

        // identity strategy: provider + providerId
        User user = userRepository
                .findByProviderAndProviderId(provider, providerId)
                .orElseGet(() -> {
                    User u = new User();
                    u.setUid(UUID.randomUUID());
                    u.setUsername(email != null ? email : "user-" + UUID.randomUUID());
                    u.setEmail(email);
                    u.setProvider(provider);
                    u.setProviderId(providerId);
                    u.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
                    u.setActive((short) 1);
                    u.setCreatedAt(LocalDateTime.now());
                    u.setFailedAttempts(0);
                    return userRepository.save(u);
                });

        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        userTokenRepository.revokeAllTokensByUserId(user.getId());

        var dto = userService.getUserById(user.getId());

        Set<String> roles = new HashSet<>(dto.getRoles() != null ? dto.getRoles() : Set.of());
        Set<String> permissions = new HashSet<>(dto.getPermissions() != null ? dto.getPermissions() : Set.of());

        String accessToken = jwtService.generateToken(
                user.getId(),
                roles,
                permissions
        );

        String refreshToken = jwtService.generateRefreshToken(user.getId());

        UserToken token = new UserToken();
        token.setUser(user);
        token.setRefreshToken(refreshToken);
        token.setCreatedAt(LocalDateTime.now());
        token.setExpiresAt(LocalDateTime.now().plusDays(7));
        token.setRevoked(false);
        userTokenRepository.save(token);

        Map<String, Object> attrs = new HashMap<>(oidcUser.getAttributes());
        attrs.put("userId", user.getId());
        attrs.put("email", email);
        attrs.put("roles", roles);
        attrs.put("permissions", permissions);

        return new DefaultOidcUser(
                oidcUser.getAuthorities(),
                oidcUser.getIdToken(),
                oidcUser.getUserInfo(),
                "sub"
        ) {
            @Override
            public Map<String, Object> getAttributes() {
                return Collections.unmodifiableMap(attrs);
            }
        };
    }
}