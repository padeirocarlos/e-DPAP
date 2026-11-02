package mz.gov.dpap.web;

import mz.gov.dpap.domain.AuditAction;
import mz.gov.dpap.service.AuditService;
import mz.gov.dpap.service.ExportService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Open-format export endpoints (BRD FR-EXP). Every export is recorded in the
 * audit log (NFR-8/17). The full SQL dump + attachments bundle (FR-EXP-4) is
 * produced by `deploy.sh dump`, outside the request path.
 */
@RestController
public class ExportController {

    private final ExportService exports;
    private final AuditService audit;

    public ExportController(ExportService exports, AuditService audit) {
        this.exports = exports;
        this.audit = audit;
    }

    @GetMapping("/actors/export")
    public ResponseEntity<byte[]> actorsExport(
            @RequestParam(defaultValue = "geojson") String format,
            @RequestParam(defaultValue = "false") boolean anonymised,
            Authentication auth) {
        String body;
        MediaType type;
        String filename;
        if (format.equalsIgnoreCase("kml")) {
            body = exports.kml(anonymised);
            type = MediaType.parseMediaType("application/vnd.google-earth.kml+xml");
            filename = "actores.kml";
        } else {
            body = exports.geoJson(anonymised);
            type = MediaType.parseMediaType("application/geo+json");
            filename = "actores.geojson";
        }
        audit.record(AuditAction.EXPORT, "ACTOR", "export",
                "Exportação " + format + (anonymised ? " (anonimizada)" : ""), auth.getName());
        return download(body, type, filename);
    }

    @GetMapping("/form/dictionary")
    public ResponseEntity<byte[]> dictionary(
            @RequestParam(defaultValue = "json") String format, Authentication auth) {
        String body;
        MediaType type;
        String filename;
        if (format.equalsIgnoreCase("csv")) {
            body = exports.dataDictionaryCsv();
            type = MediaType.parseMediaType("text/csv; charset=UTF-8");
            filename = "dicionario-dados.csv";
        } else {
            body = exports.dataDictionaryJson();
            type = MediaType.APPLICATION_JSON;
            filename = "dicionario-dados.json";
        }
        audit.record(AuditAction.EXPORT, "FORM", "dictionary",
                "Dicionário de dados (" + format + ")", auth.getName());
        return download(body, type, filename);
    }

    private ResponseEntity<byte[]> download(String body, MediaType type, String filename) {
        byte[] bytes = body.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .contentType(type)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(bytes);
    }
}
