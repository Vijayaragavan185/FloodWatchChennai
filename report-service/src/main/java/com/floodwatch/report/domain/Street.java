package com.floodwatch.report.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** A street or junction inside a ward. Many streets belong to one ward. */
@Entity
@Table(name = "streets")
public class Street {

    @Id
    private Integer id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "ward_id")
    private Ward ward;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "low_lying", nullable = false)
    private boolean lowLying;

    protected Street() { }

    public Street(Integer id, Ward ward, String name, boolean lowLying) {
        this.id = id; this.ward = ward; this.name = name; this.lowLying = lowLying;
    }

    public Integer getId() { return id; }
    public Ward getWard() { return ward; }
    public String getName() { return name; }
    public boolean isLowLying() { return lowLying; }
}
