package com.exam.attendance.service.security;

import com.exam.attendance.data.pojo.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.Set;
import java.util.UUID;

@Service
public class JwtService {
    private final JwtProperties jwtProperties;
    private final SecretKey secretKey;

    public JwtService(JwtProperties jwtProperties) {
        this.jwtProperties = jwtProperties;
        // Tạo SecretKey từ chuỗi bí mật
        this.secretKey = Keys.hmacShaKeyFor(jwtProperties.getSecret().getBytes());
    }

    // Tạo Access Token
    public String generateToken(Long userId, Set<String> roles, Set<String> permissions) {
        return Jwts.builder()
                .setSubject(String.valueOf(userId))
                .claim("roles", roles)
                .claim("permissions", permissions)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + jwtProperties.getExpiration()))
                .signWith(secretKey, SignatureAlgorithm.HS256)
                .compact();
    }

    // Tạo Refresh Token
    public String generateRefreshToken(Long userId) {
        return Jwts.builder()
                .setSubject(String.valueOf(userId))
                .claim("type", "refresh")
                .claim("jti", UUID.randomUUID().toString())
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis()
                        + jwtProperties.getRefreshExpiration()))
                .signWith(secretKey, SignatureAlgorithm.HS256)
                .compact();
    }

    // Lấy username từ token
    public String extractUsername(String token) {
        return parseClaims(token).getSubject();
    }

    // Kiểm tra token có hợp lệ không
    public boolean validateToken(String token, String username) {
        try {
            return extractUsername(token).equals(username) && !isTokenExpired(token);
        } catch (JwtException e) {
            return false;
        }
    }

    // Helpers
    private boolean isTokenExpired(String token) {
        return parseClaims(token).getExpiration().before(new Date());
    }


    public Claims parseClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(secretKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public Long extractUserId(String token) {
        return Long.valueOf(parseClaims(token).getSubject());
    }
}
