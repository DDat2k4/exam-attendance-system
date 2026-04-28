package com.exam.attendance.service.security.sso;

import com.exam.attendance.data.entity.User;
import com.exam.attendance.data.entity.UserToken;
import com.exam.attendance.data.pojo.UserDTO;
import com.exam.attendance.data.response.UserDetailResponse;
import com.exam.attendance.data.mapper.UserMapper;
import com.exam.attendance.repository.UserRepository;
import com.exam.attendance.repository.UserTokenRepository;
import com.exam.attendance.service.security.JwtService;
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
import java.util.*;

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
    public OAuth2User loadUser(OAuth2UserRequest userRequest)
            throws OAuth2AuthenticationException {

        OAuth2User oauth2User =
                new DefaultOAuth2UserService().loadUser(userRequest);

        String provider = userRequest.getClientRegistration()
                .getRegistrationId();

        String email = (String) oauth2User.getAttributes().get("email");
        String providerId = String.valueOf(oauth2User.getAttributes().get("id"));

        String username = email != null ? email : provider + "-" + providerId;

        // identity = provider + providerId
        User user = userRepository
                .findByProviderAndProviderId(provider, providerId)
                .orElseGet(() -> {
                    User u = new User();
                    u.setUid(UUID.randomUUID());
                    u.setUsername(username);
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

        // revoke tokens
        userTokenRepository.revokeAllTokensByUserId(user.getId());

        UserDTO dto = userService.getUserById(user.getId());
        UserDetailResponse userDetail = UserMapper.toResponse(dto);

        Set<String> roles = new HashSet<>(userDetail.getRoles());
        Set<String> permissions = new HashSet<>(userDetail.getPermissions());

        String accessToken = jwtService.generateToken(
                user.getId(),
                roles,
                permissions
        );

        String refreshToken = jwtService.generateRefreshToken(user.getId());

        UserToken ut = new UserToken();
        ut.setUser(user);
        ut.setRefreshToken(refreshToken);
        ut.setCreatedAt(LocalDateTime.now());
        ut.setExpiresAt(LocalDateTime.now().plusDays(7));
        ut.setRevoked(false);
        userTokenRepository.save(ut);

        // CLEAN OAuth2 attributes
        Map<String, Object> attrs = new HashMap<>(oauth2User.getAttributes());
        attrs.put("userId", user.getId());
        attrs.put("email", email);
        attrs.put("roles", roles);
        attrs.put("permissions", permissions);

        return new DefaultOAuth2User(
                oauth2User.getAuthorities(),
                attrs,
                "sub"
        );
    }
}