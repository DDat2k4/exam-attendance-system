package com.exam.attendance.data.pojo;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {

    private Long id;
    private String username;
    private String email;
    private String phone;
    private LocalDateTime lastLogin;
    private String name;
    private Short active;
    private Set<String> roles;
    private Set<String> permissions;
    private List<String> activeTokens;
}