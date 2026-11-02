package mz.gov.dpap.service;

import java.util.List;
import java.util.Map;
import mz.gov.dpap.domain.QcFlag;
import mz.gov.dpap.domain.QcSeverity;
import mz.gov.dpap.domain.Submission;
import mz.gov.dpap.form.FormService;
import mz.gov.dpap.repository.ActorRepository;
import mz.gov.dpap.repository.QcFlagRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Automated quality-control checks (BRD §8.3, FR-QC-1). Run when a submission is
 * submitted; results are stored as {@code qc_flag} rows surfaced in review.
 * Implemented: BR-QC-1 (GPS), BR-QC-3 (duration), BR-QC-4 (possible duplicate),
 * BR-QC-5 (don't-know/refused rate). BR-QC-2/6/7 need district polygons /
 * distributions and are deferred.
 */
@Service
public class QcService {

    // Maputo Province fallback bounding box (BR-QC-1).
    private static final double LAT_MIN = -27.0;
    private static final double LAT_MAX = -24.0;
    private static final double LON_MIN = 31.8;
    private static final double LON_MAX = 33.2;
    private static final double GPS_ACCURACY_THRESHOLD_M = 10;
    private static final int DURATION_MIN = 10;
    private static final int DURATION_MAX = 180;
    private static final double DK_RATE_THRESHOLD = 0.20;

    private final QcFlagRepository flags;
    private final ActorRepository actors;
    private final FormService forms;

    public QcService(QcFlagRepository flags, ActorRepository actors, FormService forms) {
        this.flags = flags;
        this.actors = actors;
        this.forms = forms;
    }

    /** Re-run all checks for a submission, replacing its existing flags. */
    @Transactional
    public List<QcFlag> runChecks(Submission s) {
        flags.deleteBySubmissionId(s.getId());
        Map<String, Object> a = s.getAnswers();

        checkGps(s);
        checkDuration(a, s);
        checkDuplicate(a, s);
        checkDontKnowRate(a, s);

        return flags.findBySubmissionIdOrderByCreatedAtAsc(s.getId());
    }

    private void raise(Submission s, String ruleId, QcSeverity severity, String message) {
        QcFlag f = new QcFlag();
        f.setSubmissionId(s.getId());
        f.setRuleId(ruleId);
        f.setSeverity(severity);
        f.setMessage(message);
        flags.save(f);
    }

    private void checkGps(Submission s) {
        Double lat = s.getLatitude();
        Double lon = s.getLongitude();
        Double acc = s.getGpsAccuracyM();
        if (lat == null || lon == null) {
            raise(s, "BR-QC-1", QcSeverity.HIGH, "Coordenadas GPS em falta.");
            return;
        }
        if (lat < LAT_MIN || lat > LAT_MAX || lon < LON_MIN || lon > LON_MAX) {
            raise(s, "BR-QC-1", QcSeverity.HIGH,
                    "O ponto GPS está fora dos limites da Província de Maputo.");
        }
        if (acc != null && acc > GPS_ACCURACY_THRESHOLD_M) {
            raise(s, "BR-QC-1", QcSeverity.HIGH,
                    "Precisão do GPS acima de 10 m (" + Math.round(acc) + " m).");
        }
    }

    private void checkDuration(Map<String, Object> a, Submission s) {
        Integer start = toMinutes(a.get("q0_03"));
        Integer end = toMinutes(a.get("q0_14"));
        if (start == null || end == null) {
            return;
        }
        int minutes = end - start;
        if (minutes < DURATION_MIN || minutes > DURATION_MAX) {
            raise(s, "BR-QC-3", QcSeverity.MEDIUM,
                    "Duração da entrevista fora do intervalo esperado (" + minutes + " min).");
        }
    }

    private void checkDuplicate(Map<String, Object> a, Submission s) {
        String phone = str(a.get("qA_09"));
        String nuit = str(a.get("qA_21"));
        String name = str(a.get("qA_01"));
        boolean dup = false;
        if (phone != null && !actors.findByPhone(phone).isEmpty()) {
            dup = true;
        }
        if (!dup && nuit != null && !actors.findByNuit(nuit).isEmpty()) {
            dup = true;
        }
        if (!dup && name != null) {
            dup = actors.findTop10ByNameContainingIgnoreCase(name).stream()
                    .anyMatch(x -> x.getName().equalsIgnoreCase(name));
        }
        if (dup) {
            raise(s, "BR-QC-4", QcSeverity.HIGH,
                    "Possível duplicado: já existe um actor com o mesmo nome, telefone ou NUIT.");
        }
    }

    private void checkDontKnowRate(Map<String, Object> a, Submission s) {
        List<String> required = forms.requiredRelevantVars(a);
        if (required.isEmpty()) {
            return;
        }
        long dk = required.stream().filter(v -> {
            Object val = a.get(v);
            if (val instanceof Number n) {
                return n.intValue() == 98 || n.intValue() == 99;
            }
            return "98".equals(String.valueOf(val)) || "99".equals(String.valueOf(val));
        }).count();
        if ((double) dk / required.size() > DK_RATE_THRESHOLD) {
            raise(s, "BR-QC-5", QcSeverity.MEDIUM,
                    "Mais de 20% dos campos obrigatórios foram respondidos com 'Não sabe/Não respondeu'.");
        }
    }

    private static Integer toMinutes(Object v) {
        if (!(v instanceof String time) || !time.contains(":")) {
            return null;
        }
        try {
            String[] parts = time.split(":");
            return Integer.parseInt(parts[0]) * 60 + Integer.parseInt(parts[1]);
        } catch (RuntimeException e) {
            return null;
        }
    }

    private static String str(Object v) {
        if (v == null) {
            return null;
        }
        String s = v.toString().trim();
        return s.isEmpty() ? null : s;
    }
}
