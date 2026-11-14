package com.floodwatch.report.repository;

import com.floodwatch.report.domain.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByPhone(String phone);

    List<AppUser> findAllByOrderByFullNameAsc();
}
