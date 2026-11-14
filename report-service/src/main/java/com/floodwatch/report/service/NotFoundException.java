package com.floodwatch.report.service;

/** Thrown when a ward, street, user or report id does not exist (HTTP 404). */
public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) { super(message); }
}
