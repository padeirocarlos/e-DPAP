package mz.gov.dpap.form;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * Mirrors {@code schema/test/expr.test.ts} so the Java and TypeScript engines
 * agree on the BRD relevance/constraint expressions (FR-FORM-4 parity).
 */
class ExprTest {

    @Test
    void equalityLooseNumericString() {
        assertThat(Expr.evaluateBool("q0_12 = 1", Map.of("q0_12", 1))).isTrue();
        assertThat(Expr.evaluateBool("q0_12 = 1", Map.of("q0_12", "1"))).isTrue();
        assertThat(Expr.evaluateBool("q0_12 = 1", Map.of("q0_12", 2))).isFalse();
    }

    @Test
    void inequality() {
        assertThat(Expr.evaluateBool("q0_13 != 1", Map.of("q0_13", 2))).isTrue();
        assertThat(Expr.evaluateBool("q0_13 ≠ 1", Map.of("q0_13", 1))).isFalse();
    }

    @Test
    void inLiteralSet() {
        assertThat(Expr.evaluateBool("q0_13 IN (1, 2, 4)", Map.of("q0_13", 4))).isTrue();
        assertThat(Expr.evaluateBool("q0_13 IN (1, 2, 4)", Map.of("q0_13", 3))).isFalse();
    }

    @Test
    void membershipInSelectMultipleArray() {
        assertThat(Expr.evaluateBool("1 IN qA_15", Map.of("qA_15", List.of(1, 4)))).isTrue();
        assertThat(Expr.evaluateBool("2 IN qA_15", Map.of("qA_15", List.of(1, 4)))).isFalse();
        assertThat(Expr.evaluateBool("1 IN qA_15", Map.of("qA_15", List.of()))).isFalse();
        assertThat(Expr.evaluateBool("1 IN qA_15", Map.of())).isFalse();
    }

    @Test
    void andOrNotPrecedence() {
        assertThat(Expr.evaluateBool("q0_12 = 1 AND q0_13 = 1", Map.of("q0_12", 1, "q0_13", 1))).isTrue();
        assertThat(Expr.evaluateBool("q0_12 = 1 AND q0_13 = 1", Map.of("q0_12", 1, "q0_13", 2))).isFalse();
        assertThat(Expr.evaluateBool("qI_02 = 2 OR qI_03 = 3", Map.of("qI_02", 2, "qI_03", 1))).isTrue();
        assertThat(Expr.evaluateBool("NOT (8 IN qC_08)", Map.of("qC_08", List.of(1, 2)))).isTrue();
        assertThat(Expr.evaluateBool("NOT (8 IN qC_08)", Map.of("qC_08", List.of(8)))).isFalse();
    }

    @Test
    void comparisonsAndArithmetic() {
        assertThat(Expr.evaluateBool("qC_03 <= qC_02", Map.of("qC_03", 3, "qC_02", 5))).isTrue();
        assertThat(Expr.evaluateBool("qC_03 <= qC_02", Map.of("qC_03", 6, "qC_02", 5))).isFalse();
        assertThat(Expr.evaluateBool("qA_06 >= 15 AND qA_06 <= 110", Map.of("qA_06", 42))).isTrue();
        assertThat(Expr.evaluateBool("qA_06 >= 15 AND qA_06 <= 110", Map.of("qA_06", 12))).isFalse();
        assertThat(Expr.evaluate("men + women", Map.of("men", 3, "women", 2))).isEqualTo(5.0);
    }

    @Test
    void missingOperandIsFalseNotCrash() {
        assertThat(Expr.evaluateBool("qA_06 >= 15", Map.of())).isFalse();
    }

    @Test
    void syntaxErrorThrows() {
        assertThatThrownBy(() -> Expr.parse("q0_12 = = 1")).isInstanceOf(Expr.ExprException.class);
        assertThatThrownBy(() -> Expr.parse("(1, 2")).isInstanceOf(Expr.ExprException.class);
    }

    @Test
    void realModuleRelevanceExpressions() {
        String moduleC = "q0_12 = 1 AND q0_13 IN (1, 2, 4) AND 1 IN qA_15";
        assertThat(Expr.isRelevant(moduleC, Map.of("q0_12", 1, "q0_13", 1, "qA_15", List.of(1, 2)))).isTrue();
        assertThat(Expr.isRelevant(moduleC, Map.of("q0_12", 1, "q0_13", 3, "qA_15", List.of(1)))).isFalse();
        assertThat(Expr.isRelevant(moduleC, Map.of("q0_12", 1, "q0_13", 1, "qA_15", List.of(2)))).isFalse();

        assertThat(Expr.isRelevant("always", Map.of())).isTrue();
        assertThat(Expr.isRelevant("", Map.of())).isTrue();
        assertThat(Expr.isRelevant(null, Map.of())).isTrue();

        assertThat(Expr.isRelevant("4 IN qA_20", Map.of("qA_20", List.of(1, 4)))).isTrue();
        assertThat(Expr.isRelevant("4 IN qA_20", Map.of("qA_20", List.of(1, 2)))).isFalse();
        assertThat(Expr.isRelevant("NOT (11 IN qD_10)", Map.of("qD_10", List.of(11)))).isFalse();
    }

    @Test
    void constraintHelper() {
        assertThat(Expr.satisfiesConstraint("qC_03 <= qC_02", Map.of("qC_03", 2, "qC_02", 5))).isTrue();
        assertThat(Expr.satisfiesConstraint("qC_03 <= qC_02", Map.of("qC_03", 7, "qC_02", 5))).isFalse();
        assertThat(Expr.satisfiesConstraint("", Map.of())).isTrue();
    }
}
