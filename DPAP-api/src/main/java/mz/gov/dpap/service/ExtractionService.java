package mz.gov.dpap.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import mz.gov.dpap.domain.Programme;
import mz.gov.dpap.domain.Relationship;
import mz.gov.dpap.domain.RosterRow;
import mz.gov.dpap.domain.Submission;
import mz.gov.dpap.form.FormService;
import mz.gov.dpap.repository.ProgrammeRepository;
import mz.gov.dpap.repository.RelationshipRepository;
import mz.gov.dpap.repository.RosterRowRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Extracts the structured children of a submission from its {@code answers}
 * jsonb into their own tables (BRD §6.1): roster rows on submit (so reviewers
 * see them), and network edges (N.03/J.13) + programmes (K.08/L.11/M.07) on
 * publish (keyed to the linked actor, feeding the Phase 5 network/dashboards).
 */
@Service
public class ExtractionService {

    private final FormService forms;
    private final RosterRowRepository rosterRows;
    private final RelationshipRepository relationships;
    private final ProgrammeRepository programmes;

    public ExtractionService(FormService forms, RosterRowRepository rosterRows,
                             RelationshipRepository relationships, ProgrammeRepository programmes) {
        this.forms = forms;
        this.rosterRows = rosterRows;
        this.relationships = relationships;
        this.programmes = programmes;
    }

    @Transactional
    public void extractRosters(Submission s) {
        rosterRows.deleteBySubmissionId(s.getId());
        for (FormService.RosterMeta r : forms.rosters()) {
            List<Map<String, Object>> rows = asRows(s.getAnswers().get(r.var()));
            int idx = 0;
            for (Map<String, Object> row : rows) {
                RosterRow rr = new RosterRow();
                rr.setSubmissionId(s.getId());
                rr.setRosterId(r.id());
                rr.setRowIndex(idx++);
                rr.setRowCode(asInt(row.get("__row")));
                rr.setData(row);
                rosterRows.save(rr);
            }
        }
    }

    @Transactional
    public void extractNetwork(Submission s, UUID actorId) {
        relationships.deleteBySubmissionId(s.getId());
        for (FormService.RosterMeta r : forms.rosters()) {
            if (!r.networkSource()) {
                continue;
            }
            for (Map<String, Object> row : asRows(s.getAnswers().get(r.var()))) {
                String name = str(row.get("partner_name"));
                if (name == null) {
                    continue;
                }
                Relationship rel = new Relationship();
                rel.setSubmissionId(s.getId());
                rel.setSourceActorId(actorId);
                rel.setTargetName(name);
                rel.setTargetActorType(asInt(firstNonNull(row.get("partner_actor_type"), row.get("actor_type"))));
                rel.setTargetLevel(asInt(row.get("partner_level")));
                rel.setRelationTypes(csv(row.get("relation_types")));
                rel.setFrequency(asInt(row.get("frequency")));
                rel.setRating(asInt(row.get("rating")));
                rel.setSupportType(asInt(row.get("support_type")));
                rel.setOriginField(r.id());
                relationships.save(rel);
            }
        }
    }

    @Transactional
    public void extractProgrammes(Submission s, UUID actorId) {
        programmes.deleteBySubmissionId(s.getId());
        for (FormService.RosterMeta r : forms.rosters()) {
            if (!r.programmeSource()) {
                continue;
            }
            for (Map<String, Object> row : asRows(s.getAnswers().get(r.var()))) {
                String name = str(row.get("name"));
                if (name == null) {
                    continue;
                }
                Programme p = new Programme();
                p.setSubmissionId(s.getId());
                p.setActorId(actorId);
                p.setName(name);
                p.setThematicArea(str(row.get("thematic_area")));
                p.setDistricts(csv(row.get("districts")));
                p.setBeneficiariesMen(asInt(row.get("beneficiaries_men")));
                p.setBeneficiariesWomen(asInt(row.get("beneficiaries_women")));
                p.setFundingSource(str(firstNonNull(row.get("funding_source"), row.get("funding"))));
                p.setBudgetUsd(asDecimal(row.get("budget_usd")));
                p.setOriginField(r.id());
                programmes.save(p);
            }
        }
    }

    // --- helpers ------------------------------------------------------------

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> asRows(Object v) {
        if (v instanceof List<?> list) {
            return list.stream()
                    .filter(e -> e instanceof Map)
                    .map(e -> (Map<String, Object>) e)
                    .collect(Collectors.toList());
        }
        return List.of();
    }

    private static Object firstNonNull(Object a, Object b) {
        return a != null ? a : b;
    }

    private static String str(Object v) {
        if (v == null) {
            return null;
        }
        String s = v.toString().trim();
        return s.isEmpty() ? null : s;
    }

    private static String csv(Object v) {
        if (v instanceof List<?> list) {
            return list.stream().map(String::valueOf).collect(Collectors.joining(","));
        }
        return str(v);
    }

    private static Integer asInt(Object v) {
        if (v instanceof Number n) {
            return n.intValue();
        }
        if (v instanceof String s && !s.isBlank()) {
            try {
                return (int) Double.parseDouble(s.trim());
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    private static BigDecimal asDecimal(Object v) {
        if (v instanceof Number n) {
            return BigDecimal.valueOf(n.doubleValue());
        }
        if (v instanceof String s && !s.isBlank()) {
            try {
                return new BigDecimal(s.trim());
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }
}
