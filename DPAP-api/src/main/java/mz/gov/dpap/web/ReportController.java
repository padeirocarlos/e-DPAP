package mz.gov.dpap.web;

import java.util.List;
import mz.gov.dpap.domain.Actor;
import mz.gov.dpap.domain.ActorType;
import mz.gov.dpap.domain.LegalStatus;
import mz.gov.dpap.domain.Sector;
import mz.gov.dpap.service.ActorService;
import mz.gov.dpap.service.ActorService.ActorFilters;
import mz.gov.dpap.service.ReportService;
import mz.gov.dpap.service.ReportService.Format;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Actor exports (CSV/XLSX/PDF). Authenticated; honors the same list filters. */
@RestController
@RequestMapping("/reports")
public class ReportController {

    private final ActorService actors;
    private final ReportService reports;

    public ReportController(ActorService actors, ReportService reports) {
        this.actors = actors;
        this.reports = reports;
    }

    @GetMapping("/actors")
    public ResponseEntity<byte[]> exportActors(
            @RequestParam(required = false) String format,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String districtCode,
            @RequestParam(required = false) String localityCode,
            @RequestParam(required = false) Sector sector,
            @RequestParam(required = false) ActorType actorType,
            @RequestParam(required = false) LegalStatus legalStatus,
            @RequestParam(required = false) String columns) {

        Format fmt = Format.fromString(format);
        List<Actor> list = actors.findForExport(new ActorFilters(
                q, districtCode, localityCode, sector, actorType, legalStatus, null, null));
        List<String> cols = (columns == null || columns.isBlank())
                ? null
                : List.of(columns.split(","));
        byte[] body = reports.generate(fmt, list, cols);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(fmt.contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"atores." + fmt.extension + "\"")
                .body(body);
    }
}
