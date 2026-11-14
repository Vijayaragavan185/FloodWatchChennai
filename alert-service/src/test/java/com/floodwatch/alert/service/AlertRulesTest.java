package com.floodwatch.alert.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** Unit tests for the alert level rules (no database needed). */
class AlertRulesTest {

    @Test
    void severityFiveIsSevere() {
        assertEquals("SEVERE", AlertService.levelFor(5, 20, 3, 3));
    }

    @Test
    void deepWaterIsSevereEvenWithLowSeverity() {
        assertEquals("SEVERE", AlertService.levelFor(2, 65, 3, 3));
    }

    @Test
    void kneeDeepIsWarning() {
        assertEquals("WARNING", AlertService.levelFor(3, 35, 3, 3));
    }

    @Test
    void mildReportIsWatchUntilStrongAgreement() {
        assertEquals("WATCH", AlertService.levelFor(2, 15, 3, 3));
        assertEquals("WARNING", AlertService.levelFor(2, 15, 6, 3));
    }

    @Test
    void levelsNeverGoDownWhileActive() {
        assertEquals("SEVERE", AlertService.higher("SEVERE", "WATCH"));
        assertEquals("WARNING", AlertService.higher("WATCH", "WARNING"));
    }
}
