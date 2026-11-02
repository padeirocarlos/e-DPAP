package mz.gov.dpap.web;

import mz.gov.dpap.dto.IndicatorsDto;
import mz.gov.dpap.dto.NetworkDto;
import mz.gov.dpap.service.IndicatorsService;
import mz.gov.dpap.service.NetworkService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Network graph (FR-NET) and BRD §9 indicators endpoints. */
@RestController
public class NetworkController {

    private final NetworkService network;
    private final IndicatorsService indicators;

    public NetworkController(NetworkService network, IndicatorsService indicators) {
        this.network = network;
        this.indicators = indicators;
    }

    @GetMapping("/network")
    public NetworkDto network(@RequestParam(required = false) Integer relationType) {
        return network.build(relationType);
    }

    @GetMapping("/indicators")
    public IndicatorsDto indicators() {
        return indicators.indicators();
    }
}
