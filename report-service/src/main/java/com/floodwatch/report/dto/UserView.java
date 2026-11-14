package com.floodwatch.report.dto;

import com.floodwatch.report.domain.AppUser;

public record UserView(Long id, String fullName, String phone, String role) {
    public static UserView of(AppUser u) {
        return new UserView(u.getId(), u.getFullName(), u.getPhone(), u.getRole().name());
    }
}
