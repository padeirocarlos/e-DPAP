package mz.gov.dpap.form;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

/**
 * Loads the bundled {@code form_schema.json} and re-validates a submission's
 * answers on the server (BRD FR-FORM-4, NFR-9) using the shared {@link Expr}
 * engine — the authoritative check before a submission may advance in the
 * workflow (BR-RT-2). Mirrors {@code schema/src/schema-model.ts validateSubmission}.
 */
@Service
public class FormService {

    /** A field-level validation error. */
    public record FieldError(String id, String var, String code, String messagePt) {
    }

    private static final Set<Integer> SPECIAL_CODES = Set.of(96, 98, 99, -1);

    private final JsonNode schema;

    public FormService(ObjectMapper objectMapper) {
        try {
            this.schema = objectMapper.readTree(
                    new ClassPathResource("form_schema.json").getInputStream());
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot load form_schema.json", e);
        }
    }

    public String version() {
        return schema.path("meta").path("version").asText("1.0");
    }

    /** Metadata for one roster, for extraction (BRD §6). */
    public record RosterMeta(String id, String var, boolean networkSource, boolean programmeSource) {
    }

    /** The raw schema JSON (data dictionary, FR-EXP-3). */
    public String schemaJson() {
        return schema.toString();
    }

    /** Flattened data dictionary rows for CSV export (FR-EXP-3). */
    public List<String[]> dictionaryRows() {
        List<String[]> rows = new ArrayList<>();
        rows.add(new String[] {"module", "id", "var", "name", "label_pt", "type", "required", "options"});
        for (JsonNode module : schema.withArray("modules")) {
            String key = module.path("key").asText();
            for (JsonNode f : module.withArray("fields")) {
                StringBuilder opts = new StringBuilder();
                if (f.has("list")) {
                    opts.append("list:").append(f.get("list").asText());
                } else if (f.has("options")) {
                    for (JsonNode o : f.get("options")) {
                        if (opts.length() > 0) {
                            opts.append("; ");
                        }
                        opts.append(o.path("code").asText()).append("=").append(o.path("label_pt").asText());
                    }
                }
                rows.add(new String[] {
                        key, f.path("id").asText(), f.path("var").asText(), f.path("name").asText(),
                        f.path("label_pt").asText(), f.path("type").asText(), f.path("required").asText(),
                        opts.toString()});
            }
        }
        return rows;
    }

    /**
     * Per-module response statistics across a set of submission answer maps
     * (BRD §9 / dashboards). For each module it reports the field count, how
     * many submissions the module was relevant to, and the completeness % =
     * answered relevant fields / relevant fields over those submissions.
     * Schema-driven: modules, fields and relevance all come from the schema.
     */
    public record ModuleStat(
            String key, String titlePt, int fieldCount, long applicableSubmissions, int completenessPct) {
    }

    public List<ModuleStat> moduleStats(List<Map<String, Object>> submissionAnswers) {
        List<ModuleStat> out = new ArrayList<>();
        for (JsonNode module : schema.withArray("modules")) {
            String key = module.path("key").asText();
            String titlePt = module.path("title_pt").asText(key);
            int fieldCount = module.withArray("fields").size();
            String moduleRelevance = module.path("relevance").asText(null);

            long applicable = 0;
            long answered = 0;
            long relevant = 0;
            for (Map<String, Object> answers : submissionAnswers) {
                if (!Expr.isRelevant(moduleRelevance, answers)) {
                    continue;
                }
                applicable++;
                for (JsonNode f : module.withArray("fields")) {
                    if (!Expr.isRelevant(f.path("relevance").asText(null), answers)) {
                        continue;
                    }
                    relevant++;
                    if (isAnswered(answers.get(f.path("var").asText()))) {
                        answered++;
                    }
                }
            }
            int pct = relevant == 0 ? 0 : (int) Math.round(100.0 * answered / relevant);
            out.add(new ModuleStat(key, titlePt, fieldCount, applicable, pct));
        }
        return out;
    }

    /** Every roster declared in the schema. */
    public List<RosterMeta> rosters() {
        List<RosterMeta> out = new ArrayList<>();
        for (JsonNode module : schema.withArray("modules")) {
            for (JsonNode r : module.withArray("rosters")) {
                String id = r.path("id").asText();
                String var = r.path("var").asText(id);
                out.add(new RosterMeta(
                        id, var,
                        r.path("network_source").asBoolean(false),
                        r.path("programme_source").asBoolean(false)));
            }
        }
        return out;
    }

    /** The variables of every required, currently-relevant field (for QC BR-QC-5). */
    public List<String> requiredRelevantVars(Map<String, Object> answers) {
        List<String> vars = new ArrayList<>();
        for (JsonNode module : schema.withArray("modules")) {
            if (!Expr.isRelevant(module.path("relevance").asText(null), answers)) {
                continue;
            }
            for (JsonNode f : module.withArray("fields")) {
                String required = f.path("required").asText("N");
                if ((required.equals("Y") || required.equals("C"))
                        && Expr.isRelevant(f.path("relevance").asText(null), answers)) {
                    vars.add(f.path("var").asText());
                }
            }
        }
        return vars;
    }

    /** Validate every relevant field of a submission answer context. */
    public List<FieldError> validate(Map<String, Object> answers) {
        List<FieldError> errors = new ArrayList<>();
        for (JsonNode module : schema.withArray("modules")) {
            if (!Expr.isRelevant(module.path("relevance").asText(null), answers)) {
                continue;
            }
            for (JsonNode field : module.withArray("fields")) {
                validateField(field, answers, errors);
            }
        }
        return errors;
    }

    private void validateField(JsonNode f, Map<String, Object> answers, List<FieldError> errors) {
        String relevance = f.path("relevance").asText(null);
        if (!Expr.isRelevant(relevance, answers)) {
            return;
        }

        String id = f.path("id").asText();
        String var = f.path("var").asText();
        String type = f.path("type").asText();
        String required = f.path("required").asText("N");
        String labelPt = f.path("label_pt").asText(var);
        Object value = answers.get(var);
        boolean systemGenerated = f.path("system_generated").asBoolean(false);

        boolean isRequired = required.equals("Y") || required.equals("C");
        if (isRequired && !isAnswered(value) && !systemGenerated) {
            errors.add(new FieldError(id, var, "required",
                    "O campo \"" + labelPt + "\" é obrigatório."));
        }

        if (type.equals("select_multiple") && value instanceof List<?> list) {
            List<Integer> codes = new ArrayList<>();
            for (Object o : list) {
                Double d = toInt(o);
                if (d != null) {
                    codes.add(d.intValue());
                }
            }
            if (f.has("max_select")) {
                int max = f.get("max_select").asInt();
                long nonSpecial = codes.stream().filter(c -> !SPECIAL_CODES.contains(c)).count();
                if (nonSpecial > max) {
                    errors.add(new FieldError(id, var, "max_select",
                            "Seleccione no máximo " + max + " opções em \"" + labelPt + "\"."));
                }
            }
            if (f.has("exclusive_code")) {
                int exclusive = f.get("exclusive_code").asInt();
                if (codes.contains(exclusive) && codes.size() > 1) {
                    errors.add(new FieldError(id, var, "exclusive",
                            "A opção seleccionada é exclusiva em \"" + labelPt + "\"."));
                }
            }
        }

        String constraint = f.path("constraint").asText(null);
        if (constraint != null && !constraint.isBlank() && isAnswered(value)
                && !Expr.satisfiesConstraint(constraint, answers)) {
            String msg = f.path("constraint_message_pt").asText("Valor inválido em \"" + labelPt + "\".");
            errors.add(new FieldError(id, var, "constraint", msg));
        }
    }

    private static boolean isAnswered(Object v) {
        if (v == null || "".equals(v)) {
            return false;
        }
        if (v instanceof List<?> l) {
            return !l.isEmpty();
        }
        return true;
    }

    private static Double toInt(Object o) {
        if (o instanceof Number n) {
            return n.doubleValue();
        }
        if (o instanceof String s && !s.isBlank()) {
            try {
                return Double.parseDouble(s.trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }
}
