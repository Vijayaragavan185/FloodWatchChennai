package com.floodwatch.report.repository;

import com.floodwatch.report.domain.Ward;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WardRepository extends JpaRepository<Ward, Integer> {

    /** Derived query: wards in reading order of the city grid (north to south, west to east). */
    List<Ward> findAllByOrderByGridRowAscGridColAsc();
}
