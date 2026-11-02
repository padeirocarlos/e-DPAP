package mz.gov.dpap.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.List;
import mz.gov.dpap.domain.Actor;
import mz.gov.dpap.domain.ActorType;
import mz.gov.dpap.domain.RegistryStatus;
import mz.gov.dpap.form.FormService;
import mz.gov.dpap.repository.ActorRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Open-format exports (BRD FR-EXP): GeoJSON/KML of georeferenced actors, the
 * data dictionary (FR-EXP-3), and an anonymised option (FR-EXP-5: drop
 * name/contacts and jitter the point for individual producers). Full SQL dump +
 * CSV bundle (FR-EXP-4) is the `deploy.sh dump` script, not an HTTP endpoint.
 */
@Service
public class ExportService {

    private static final double JITTER_DEG = 0.01; // ~1.1 km (FR-PRV-3)

    private final ActorRepository actors;
    private final FormService forms;
    private final ObjectMapper mapper;

    public ExportService(ActorRepository actors, FormService forms, ObjectMapper mapper) {
        this.actors = actors;
        this.forms = forms;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public String geoJson(boolean anonymised) {
        ObjectNode root = mapper.createObjectNode();
        root.put("type", "FeatureCollection");
        ArrayNode features = root.putArray("features");
        for (Actor a : activeActors()) {
            boolean individual = a.getActorType() == ActorType.PRODUCER;
            double[] pt = point(a, anonymised && individual);
            ObjectNode feature = features.addObject();
            feature.put("type", "Feature");
            ObjectNode geom = feature.putObject("geometry");
            geom.put("type", "Point");
            geom.putArray("coordinates").add(pt[0]).add(pt[1]);
            ObjectNode props = feature.putObject("properties");
            props.put("actorUid", a.getActorUid());
            props.put("name", displayName(a, anonymised && individual));
            props.put("actorType", a.getActorType() != null ? a.getActorType().name() : null);
            props.put("sector", a.getSector() != null ? a.getSector().name() : null);
            props.put("district", a.getDistrictCode());
            if (!anonymised) {
                props.put("phone", a.getPhone());
                props.put("nuit", a.getNuit());
            }
        }
        return root.toString();
    }

    @Transactional(readOnly = true)
    public String kml(boolean anonymised) {
        StringBuilder sb = new StringBuilder();
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        sb.append("<kml xmlns=\"http://www.opengis.net/kml/2.2\"><Document>\n");
        sb.append("<name>Atores DPAP Maputo</name>\n");
        for (Actor a : activeActors()) {
            boolean individual = a.getActorType() == ActorType.PRODUCER;
            double[] pt = point(a, anonymised && individual);
            sb.append("<Placemark><name>").append(xml(displayName(a, anonymised && individual)))
                    .append("</name>");
            sb.append("<description>").append(xml(a.getActorUid())).append("</description>");
            sb.append("<Point><coordinates>").append(pt[0]).append(",").append(pt[1])
                    .append(",0</coordinates></Point>");
            sb.append("</Placemark>\n");
        }
        sb.append("</Document></kml>\n");
        return sb.toString();
    }

    public String dataDictionaryJson() {
        return forms.schemaJson();
    }

    public String dataDictionaryCsv() {
        StringBuilder sb = new StringBuilder("﻿"); // UTF-8 BOM for Excel
        for (String[] row : forms.dictionaryRows()) {
            sb.append(String.join(",", java.util.Arrays.stream(row).map(ExportService::csv).toList()));
            sb.append("\r\n");
        }
        return sb.toString();
    }

    // --- helpers ------------------------------------------------------------

    private List<Actor> activeActors() {
        return actors.findAll().stream()
                .filter(a -> a.getRegistryStatus() == RegistryStatus.ACTIVE)
                .toList();
    }

    private static double[] point(Actor a, boolean jitter) {
        double lon = a.getLongitude();
        double lat = a.getLatitude();
        if (jitter) {
            // Deterministic offset from the id so repeated exports match.
            long h = a.getId().hashCode();
            lon += ((h % 1000) / 1000.0 - 0.5) * 2 * JITTER_DEG;
            lat += (((h / 1000) % 1000) / 1000.0 - 0.5) * 2 * JITTER_DEG;
        }
        return new double[] {round6(lon), round6(lat)};
    }

    private static String displayName(Actor a, boolean anonymise) {
        return anonymise ? "(produtor anonimizado)" : a.getName();
    }

    private static double round6(double v) {
        return Math.round(v * 1_000_000d) / 1_000_000d;
    }

    private static String xml(String v) {
        return v == null ? "" : v.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private static String csv(String v) {
        if (v == null) {
            return "";
        }
        if (v.contains(",") || v.contains("\"") || v.contains("\n")) {
            return "\"" + v.replace("\"", "\"\"") + "\"";
        }
        return v;
    }
}
