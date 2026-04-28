package com.exam.attendance.data.entity;

import com.exam.attendance.data.pojo.enums.Action;
import com.exam.attendance.data.pojo.enums.Resource;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "permissions",
        uniqueConstraints = @UniqueConstraint(columnNames = {"resource", "action"}))
public class Permission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Resource resource;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Action action;

    private String description;

    @OneToMany(mappedBy = "permission", fetch = FetchType.LAZY)
    private List<RolePermission> roles;

    public String toAuthority() {
        return resource.name().toLowerCase() + ":" + action.name().toLowerCase();
    }
}