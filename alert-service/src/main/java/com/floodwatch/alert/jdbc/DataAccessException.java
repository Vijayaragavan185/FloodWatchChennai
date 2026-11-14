package com.floodwatch.alert.jdbc;

/** Unchecked wrapper so SQLException does not leak into the web layer. */
public class DataAccessException extends RuntimeException {
    public DataAccessException(String message, Throwable cause) { super(message, cause); }
}
