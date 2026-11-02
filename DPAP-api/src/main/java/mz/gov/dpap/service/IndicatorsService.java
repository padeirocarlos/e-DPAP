package mz.gov.dpap.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import mz.gov.dpap.domain.Programme;
import mz.gov.dpap.domain.Submission;
import mz.gov.dpap.domain.SubmissionStatus;
import mz.gov.dpap.dto.IndicatorsDto;
import mz.gov.dpap.dto.IndicatorsDto.CodeCount;
import mz.gov.dpap.dto.NetworkDto;
import mz.gov.dpap.repository.ProgrammeRepository;
import mz.gov.dpap.repository.SubmissionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Aggregates a subset of the BRD §9 indicators from published submissions,
 * extracted programmes and the network graph. Computed in Java (volumes are
 * small); roster-level indicators are deferred.
 */
@Service
public class IndicatorsService {

    private final SubmissionRepository submissions;
    private final ProgrammeRepository programmes;
    private final NetworkService network;
    private final mz.gov.dpap.form.FormService forms;

    public IndicatorsService(SubmissionRepository submissions, ProgrammeRepository programmes,
                             NetworkService network, mz.gov.dpap.form.FormService forms) {
        this.submissions = submissions;
        this.programmes = programmes;
        this.network = network;
        this.forms = forms;
    }

    @Transactional(readOnly = true)
    public IndicatorsDto indicators() {
        List<Submission> published = submissions.findByStatus(SubmissionStatus.PUBLISHED);

        List<CodeCount> byLevel = countBy(published, s ->
                s.getOperationLevel() != null ? String.valueOf(s.getOperationLevel()) : null);
        List<CodeCount> bySex = countByAnswer(published, "qA_05");
        List<CodeCount> knowsPlans = countByAnswer(published, "qN_01");
        List<CodeCount> participates = countByAnswer(published, "qN_02");

        List<Programme> progs = programmes.findAll();
        long benMen = progs.stream().mapToLong(p -> p.getBeneficiariesMen() != null ? p.getBeneficiariesMen() : 0).sum();
        long benWomen = progs.stream().mapToLong(p -> p.getBeneficiariesWomen() != null ? p.getBeneficiariesWomen() : 0).sum();
        List<CodeCount> byThematic = countStrings(progs.stream().map(Programme::getThematicArea).toList());
        List<CodeCount> byDistrict = countCsv(progs.stream().map(Programme::getDistricts).toList());

        List<IndicatorsDto.ModuleStat> byModule = forms
                .moduleStats(published.stream().map(Submission::getAnswers).toList())
                .stream()
                .map(ms -> new IndicatorsDto.ModuleStat(
                        ms.key(), ms.titlePt(), ms.fieldCount(),
                        ms.applicableSubmissions(), ms.completenessPct()))
                .toList();

        NetworkDto.Metrics net = network.build(null).metrics();

        return new IndicatorsDto(
                published.size(),
                byLevel,
                bySex,
                byModule,
                new IndicatorsDto.Programmes(progs.size(), benMen, benWomen, byThematic, byDistrict),
                new IndicatorsDto.Coordination(knowsPlans, participates, net.nodeCount(), net.edgeCount()));
    }

    private interface Key {
        String of(Submission s);
    }

    private static List<CodeCount> countBy(List<Submission> items, Key key) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (Submission s : items) {
            String k = key.of(s);
            if (k != null) {
                counts.merge(k, 1L, Long::sum);
            }
        }
        return toList(counts);
    }

    private static List<CodeCount> countByAnswer(List<Submission> items, String var) {
        return countBy(items, s -> {
            Object v = s.getAnswers().get(var);
            return v == null ? null : String.valueOf(v instanceof Number n ? n.intValue() : v);
        });
    }

    private static List<CodeCount> countStrings(List<String> values) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                counts.merge(v.trim(), 1L, Long::sum);
            }
        }
        return toList(counts);
    }

    private static List<CodeCount> countCsv(List<String> csvValues) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (String csv : csvValues) {
            if (csv == null || csv.isBlank()) {
                continue;
            }
            for (String part : csv.split(",")) {
                String c = part.trim();
                if (!c.isEmpty()) {
                    counts.merge(c, 1L, Long::sum);
                }
            }
        }
        return toList(counts);
    }

    private static List<CodeCount> toList(Map<String, Long> counts) {
        List<CodeCount> out = new ArrayList<>();
        counts.forEach((k, v) -> out.add(new CodeCount(k, v)));
        out.sort((a, b) -> Long.compare(b.count(), a.count()));
        return out;
    }
}
