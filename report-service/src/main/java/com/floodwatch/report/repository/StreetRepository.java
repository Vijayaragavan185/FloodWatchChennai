package com.floodwatch.report.repository;

import com.floodwatch.report.domain.Street;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StreetRepository extends JpaRepository<Street, Integer> {

    List<Street> findByWard_IdOrderByNameAsc(Integer wardId);
}
