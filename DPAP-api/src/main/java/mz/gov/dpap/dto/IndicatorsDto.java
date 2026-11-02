package mz.gov.dpap.dto;

import java.util.List;

/**
 * A subset of the BRD §9 indicators computed from published submissions +
 * extracted programmes + the network (IND-01 by level, IND-02 by sex, IND-16
 * programmes, IND-18 coordination). Roster-heavy indicators (IND-05/06/07/08…)
 * are a later data-aggregation pass.
 */
public record IndicatorsDto(
        long publishedActors,
        List<CodeCount> actorsByLevel,
        List<CodeCount> respondentsBySex,
        List<ModuleStat> byModule,
        Programmes programmes,
        Coordination coordination) {

    public record CodeCount(String code, long count) {
    }

    /** Per-questionnaire-module response statistics (data conformance / §9). */
    public record ModuleStat(
            String key, String title, int fieldCount, long applicableSubmissions, int completenessPct) {
    }

    public record Programmes(
            long count,
            long beneficiariesMen,
            long beneficiariesWomen,
            List<CodeCount> byThematicArea,
            List<CodeCount> byDistrict) {
    }

    public record Coordination(
            List<CodeCount> knowsGovPlans,
            List<CodeCount> participatesPlanning,
            int networkNodes,
            int networkEdges) {
    }
}
