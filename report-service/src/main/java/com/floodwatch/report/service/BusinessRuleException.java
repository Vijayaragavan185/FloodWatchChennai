package com.floodwatch.report.service;

/** Thrown when a request breaks a FloodWatch rule, e.g. voting twice (HTTP 409). */
public class BusinessRuleException extends RuntimeException {
    public BusinessRuleException(String message) { super(message); }
}
