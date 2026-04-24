package com.exam.attendance.data.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashSet;
import java.util.Set;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AuthResponse {
    private Long userId;
    private String userName;
    private String email;
    private String provider;
    private String accessToken;
    private String refreshToken;
    private Set<String> roles = new HashSet<>();
    private Set<String> permissions = new HashSet<>();
}
