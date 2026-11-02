package mz.gov.dpap.dto;

import java.util.List;

/**
 * The multi-actor relationship graph (BRD FR-NET). Nodes are registered actors
 * plus unregistered partners (free-text names from N.03/J.13); edges are the
 * relationships. Metrics give degree, most-connected and isolated counts.
 */
public record NetworkDto(List<Node> nodes, List<Edge> edges, Metrics metrics) {

    public record Node(
            String id,
            String label,
            Integer actorType,
            Integer level,
            boolean registered,
            String actorUid,
            int degree) {
    }

    public record Edge(
            String source,
            String target,
            String relationTypes,
            String originField) {
    }

    public record Metrics(
            int nodeCount,
            int edgeCount,
            int registeredCount,
            int isolatedCount,
            List<TopActor> mostConnected) {
    }

    public record TopActor(String id, String label, int degree) {
    }
}
