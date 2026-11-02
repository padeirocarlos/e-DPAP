package mz.gov.dpap.config;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import mz.gov.dpap.domain.FormVersion;
import mz.gov.dpap.domain.FormVersionStatus;
import mz.gov.dpap.domain.SurveyRound;
import mz.gov.dpap.domain.SurveyRoundStatus;
import mz.gov.dpap.repository.FormVersionRepository;
import mz.gov.dpap.repository.SurveyRoundRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;

/**
 * Seeds the operational form version and baseline survey round on first start
 * (BRD FR-FORM-10, FR-ADM-3). Unlike {@link DataSeeder} this is NOT demo data —
 * the system needs a published form version to accept submissions — so it runs
 * regardless of {@code app.seed.demo-data}. The schema dictionary is loaded from
 * the bundled {@code form_schema.json} (the canonical copy lives in the repo-root
 * {@code /schema} package and is copied here; keep them in sync).
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class FormVersionSeeder implements CommandLineRunner {

    private final FormVersionRepository formVersions;
    private final SurveyRoundRepository rounds;

    public FormVersionSeeder(FormVersionRepository formVersions, SurveyRoundRepository rounds) {
        this.formVersions = formVersions;
        this.rounds = rounds;
    }

    @Override
    public void run(String... args) throws Exception {
        if (formVersions.count() > 0) {
            return;
        }

        String schemaJson = StreamUtils.copyToString(
                new ClassPathResource("form_schema.json").getInputStream(), StandardCharsets.UTF_8);

        FormVersion v1 = new FormVersion();
        v1.setVersion("1.0");
        v1.setStatus(FormVersionStatus.PUBLISHED);
        v1.setSchemaJson(schemaJson);
        v1.setPublishedAt(Instant.now());
        v1 = formVersions.save(v1);

        if (rounds.count() == 0) {
            SurveyRound baseline = new SurveyRound();
            baseline.setName("Linha de base 2026");
            baseline.setStatus(SurveyRoundStatus.ACTIVE);
            baseline.setStartDate(LocalDate.of(2026, 1, 1));
            baseline.setFormVersion(v1);
            rounds.save(baseline);
        }
    }
}
