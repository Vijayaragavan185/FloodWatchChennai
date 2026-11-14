package com.floodwatch.alert.model;

/** A street returned by one of the set-operation insight queries. */
public record StreetInsight(int streetId, String streetName, String wardName, String zone, int reports) { }
