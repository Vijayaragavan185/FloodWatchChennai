package com.floodwatch.alert.jdbc;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

/**
 * Opens JDBC connections with {@link DriverManager}.
 * Step 1 load the driver class, step 2 ask DriverManager for a Connection.
 */
@Component
public class ConnectionFactory {

    private final String url;
    private final String user;
    private final String password;

    public ConnectionFactory(@Value("${floodwatch.db.driver}") String driver,
                             @Value("${floodwatch.db.url}") String url,
                             @Value("${floodwatch.db.user}") String user,
                             @Value("${floodwatch.db.password}") String password) {
        this.url = url; this.user = user; this.password = password;
        try {
            Class.forName(driver);            // registers the MySQL driver with DriverManager
        } catch (ClassNotFoundException ex) {
            throw new IllegalStateException("JDBC driver not on classpath: " + driver, ex);
        }
    }

    public Connection open() throws SQLException {
        return DriverManager.getConnection(url, user, password);
    }
}
