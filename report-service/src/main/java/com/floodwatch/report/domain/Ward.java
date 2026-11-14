package com.floodwatch.report.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A Greater Chennai locality (ward group) placed on the schematic city grid. */
@Entity
@Table(name = "wards")
public class Ward {

    @Id
    private Integer id;

    @Column(nullable = false, unique = true, length = 8)
    private String code;

    @Column(nullable = false, length = 60)
    private String name;

    @Column(nullable = false, length = 40)
    private String zone;

    @Column(name = "grid_row", nullable = false)
    private int gridRow;

    @Column(name = "grid_col", nullable = false)
    private int gridCol;

    protected Ward() { }

    public Ward(Integer id, String code, String name, String zone, int gridRow, int gridCol) {
        this.id = id; this.code = code; this.name = name; this.zone = zone;
        this.gridRow = gridRow; this.gridCol = gridCol;
    }

    public Integer getId() { return id; }
    public String getCode() { return code; }
    public String getName() { return name; }
    public String getZone() { return zone; }
    public int getGridRow() { return gridRow; }
    public int getGridCol() { return gridCol; }
}
