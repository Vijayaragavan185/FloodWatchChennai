package com.floodwatch.report.dto;

import com.floodwatch.report.domain.Ward;

public record WardView(Integer id, String code, String name, String zone, int gridRow, int gridCol) {
    public static WardView of(Ward w) {
        return new WardView(w.getId(), w.getCode(), w.getName(), w.getZone(), w.getGridRow(), w.getGridCol());
    }
}
