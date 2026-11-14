package com.floodwatch.report.dto;

import com.floodwatch.report.domain.Street;

public record StreetView(Integer id, Integer wardId, String name, boolean lowLying) {
    public static StreetView of(Street s) {
        return new StreetView(s.getId(), s.getWard().getId(), s.getName(), s.isLowLying());
    }
}
