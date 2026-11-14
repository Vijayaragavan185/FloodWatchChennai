package com.floodwatch.report.web;

import com.floodwatch.report.dto.CityStats;
import com.floodwatch.report.dto.StreetView;
import com.floodwatch.report.dto.WardSummary;
import com.floodwatch.report.dto.WardView;
import com.floodwatch.report.service.ReportService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Presentation layer: wards, streets, map summary and city statistics. */
@RestController
@RequestMapping("/api")
public class WardController {

    private final ReportService service;

    public WardController(ReportService service) { this.service = service; }

    @GetMapping("/wards")
    public List<WardView> wards() { return service.listWards(); }

    @GetMapping("/wards/{id}/streets")
    public List<StreetView> streets(@PathVariable("id") Integer id) { return service.listStreets(id); }

    @GetMapping("/wards/summary")
    public List<WardSummary> summary() { return service.wardSummaries(); }

    @GetMapping("/stats")
    public CityStats stats() { return service.cityStats(); }
}
