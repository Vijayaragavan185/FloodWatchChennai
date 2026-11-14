package com.floodwatch.report.web;

import com.floodwatch.report.dto.CreateUserRequest;
import com.floodwatch.report.dto.UserView;
import com.floodwatch.report.service.ReportService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final ReportService service;

    public UserController(ReportService service) { this.service = service; }

    @GetMapping
    public List<UserView> list() { return service.listUsers(); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserView register(@RequestBody CreateUserRequest request) { return service.register(request); }
}
