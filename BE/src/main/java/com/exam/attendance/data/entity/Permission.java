package com.exam.attendance.data.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "permissions")
public class Permission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String code;

    private String description;

    @OneToMany(mappedBy = "permission", fetch = FetchType.LAZY)
    @ToString.Exclude
    private List<RolePermission> roles;
}