package mz.gov.dpap.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import mz.gov.dpap.domain.Actor;
import mz.gov.dpap.domain.QcFlag;
import mz.gov.dpap.domain.Submission;
import mz.gov.dpap.form.FormService;
import mz.gov.dpap.repository.ActorRepository;
import mz.gov.dpap.repository.QcFlagRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/** Unit tests for the automated QC checks (BRD §8.3). */
class QcServiceTest {

    @Mock private QcFlagRepository flags;
    @Mock private ActorRepository actors;
    private QcService qc;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        qc = new QcService(flags, actors, new FormService(new ObjectMapper()));
        when(flags.save(any(QcFlag.class))).thenAnswer(i -> i.getArgument(0));
        when(flags.findBySubmissionIdOrderByCreatedAtAsc(any())).thenReturn(List.of());
    }

    private Submission submission(Map<String, Object> answers, Double lat, Double lon, Double acc) {
        Submission s = new Submission();
        s.setId(UUID.randomUUID());
        s.setAnswers(answers);
        s.setLatitude(lat);
        s.setLongitude(lon);
        s.setGpsAccuracyM(acc);
        return s;
    }

    private List<String> rulesRaised() {
        ArgumentCaptor<QcFlag> cap = ArgumentCaptor.forClass(QcFlag.class);
        org.mockito.Mockito.verify(flags, org.mockito.Mockito.atLeast(0)).save(cap.capture());
        return cap.getAllValues().stream().map(QcFlag::getRuleId).toList();
    }

    @Test
    void flagsMissingGps() {
        qc.runChecks(submission(Map.of(), null, null, null));
        assertThat(rulesRaised()).contains("BR-QC-1");
    }

    @Test
    void flagsGpsOutsideProvince() {
        // Lisbon-ish — well outside Maputo.
        qc.runChecks(submission(Map.of(), 38.7, -9.1, 5.0));
        assertThat(rulesRaised()).contains("BR-QC-1");
    }

    @Test
    void flagsLowAccuracy() {
        qc.runChecks(submission(Map.of(), -26.0, 32.5, 50.0));
        assertThat(rulesRaised()).contains("BR-QC-1");
    }

    @Test
    void cleanGpsInsideProvinceRaisesNoGpsFlag() {
        qc.runChecks(submission(Map.of(), -26.0, 32.5, 6.0));
        assertThat(rulesRaised()).doesNotContain("BR-QC-1");
    }

    @Test
    void flagsShortDuration() {
        var s = submission(Map.of("q0_03", "09:00", "q0_14", "09:05"), -26.0, 32.5, 6.0);
        qc.runChecks(s);
        assertThat(rulesRaised()).contains("BR-QC-3");
    }

    @Test
    void flagsPossibleDuplicateByPhone() {
        when(actors.findByPhone("+258821112233")).thenReturn(List.of(new Actor()));
        var s = submission(Map.of("qA_09", "+258821112233"), -26.0, 32.5, 6.0);
        qc.runChecks(s);
        assertThat(rulesRaised()).contains("BR-QC-4");
    }
}
