package mz.gov.dpap.form;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * Server-side submission re-validation against the real bundled form_schema.json
 * (BRD BR-RT-2). Mirrors {@code schema/test/validate.test.ts}.
 */
class FormServiceTest {

    private final FormService forms = new FormService(new ObjectMapper());

    @Test
    void loadsBundledSchemaVersion() {
        assertThat(forms.version()).isEqualTo("1.0");
    }

    @Test
    void noConsentRaisesOnlyModuleZeroErrors() {
        // 0.12 = 2 → modules A–O not relevant; only module 0 applies.
        List<FormService.FieldError> errors = forms.validate(Map.of("q0_12", 2, "q0_15", 3));
        assertThat(errors).allSatisfy(e -> assertThat(e.id()).startsWith("0."));
    }

    @Test
    void individualProducerDoesNotTriggerAssociationOrCompanyModules() {
        Map<String, Object> ctx = new HashMap<>();
        ctx.put("q0_12", 1);
        ctx.put("q0_13", 1);
        ctx.put("qA_15", List.of(1));
        List<FormService.FieldError> errors = forms.validate(ctx);
        assertThat(errors).extracting(e -> e.id().substring(0, 1))
                .doesNotContain("J", "K", "L", "M");
        // A.01 (actor name) is required and missing here.
        assertThat(errors).anySatisfy(e -> assertThat(e.id()).isEqualTo("A.01"));
    }

    @Test
    void rejectsMoreThanThreeConstraintOptionsAndExclusiveMix() {
        Map<String, Object> ctx = new HashMap<>();
        ctx.put("q0_12", 1);
        ctx.put("q0_13", 1);
        ctx.put("qA_15", List.of(1));
        ctx.put("qC_11", List.of(1, 2, 3, 4)); // max 3
        ctx.put("qC_08", List.of(8, 1));       // exclusive 8 mixed
        List<FormService.FieldError> errors = forms.validate(ctx);
        assertThat(errors).anySatisfy(e -> {
            assertThat(e.id()).isEqualTo("C.11");
            assertThat(e.code()).isEqualTo("max_select");
        });
        assertThat(errors).anySatisfy(e -> {
            assertThat(e.id()).isEqualTo("C.08");
            assertThat(e.code()).isEqualTo("exclusive");
        });
    }
}
