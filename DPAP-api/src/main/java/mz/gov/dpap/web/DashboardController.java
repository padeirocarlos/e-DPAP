package mz.gov.dpap.web;

import mz.gov.dpap.dto.DashboardStatsDto;
import mz.gov.dpap.service.DashboardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/dashboard")
public class DashboardController {

    private final DashboardService dashboard;

    public DashboardController(DashboardService dashboard) {
        this.dashboard = dashboard;
    }

    @GetMapping("/stats")
    public DashboardStatsDto stats() {
        return dashboard.stats();
    }
}
