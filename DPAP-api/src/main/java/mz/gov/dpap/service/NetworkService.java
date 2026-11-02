package mz.gov.dpap.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import mz.gov.dpap.domain.Actor;
import mz.gov.dpap.domain.Relationship;
import mz.gov.dpap.dto.NetworkDto;
import mz.gov.dpap.repository.ActorRepository;
import mz.gov.dpap.repository.RelationshipRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Builds the multi-actor relationship graph (BRD FR-NET-1/3/5) from the
 * {@code relationship} edges extracted on publish. Registered actors and
 * free-text (unregistered) partners both become nodes; degree, most-connected
 * and isolated counts give the basic metrics.
 */
@Service
public class NetworkService {

    private final RelationshipRepository relationships;
    private final ActorRepository actors;

    public NetworkService(RelationshipRepository relationships, ActorRepository actors) {
        this.relationships = relationships;
        this.actors = actors;
    }

    @Transactional(readOnly = true)
    public NetworkDto build(Integer relationType) {
        List<Relationship> edges = relationships.findAll();
        if (relationType != null) {
            edges = edges.stream().filter(e -> containsCode(e.getRelationTypes(), relationType)).toList();
        }

        // Resolve registered actor labels in one batch.
        List<UUID> actorIds = new ArrayList<>();
        for (Relationship e : edges) {
            if (e.getSourceActorId() != null) {
                actorIds.add(e.getSourceActorId());
            }
            if (e.getTargetActorId() != null) {
                actorIds.add(e.getTargetActorId());
            }
        }
        Map<UUID, Actor> actorById = actors.findAllById(actorIds).stream()
                .collect(Collectors.toMap(Actor::getId, a -> a));

        Map<String, NetworkDto.Node> nodes = new HashMap<>();
        Map<String, Integer> degree = new HashMap<>();
        List<NetworkDto.Edge> edgeDtos = new ArrayList<>();

        for (Relationship e : edges) {
            String sourceId = registeredNode(e.getSourceActorId(), actorById, nodes);
            String targetId = e.getTargetActorId() != null
                    ? registeredNode(e.getTargetActorId(), actorById, nodes)
                    : unregisteredNode(e, nodes);
            if (sourceId == null || targetId == null) {
                continue;
            }
            edgeDtos.add(new NetworkDto.Edge(sourceId, targetId, e.getRelationTypes(), e.getOriginField()));
            degree.merge(sourceId, 1, Integer::sum);
            degree.merge(targetId, 1, Integer::sum);
        }

        List<NetworkDto.Node> nodeList = nodes.values().stream()
                .map(n -> new NetworkDto.Node(n.id(), n.label(), n.actorType(), n.level(),
                        n.registered(), n.actorUid(), degree.getOrDefault(n.id(), 0)))
                .sorted(Comparator.comparingInt(NetworkDto.Node::degree).reversed())
                .toList();

        long registered = nodeList.stream().filter(NetworkDto.Node::registered).count();
        long totalActors = actors.count();
        int isolated = (int) Math.max(0, totalActors - registered);

        List<NetworkDto.TopActor> top = nodeList.stream()
                .filter(NetworkDto.Node::registered)
                .limit(5)
                .map(n -> new NetworkDto.TopActor(n.id(), n.label(), n.degree()))
                .toList();

        return new NetworkDto(nodeList, edgeDtos,
                new NetworkDto.Metrics(nodeList.size(), edgeDtos.size(), (int) registered, isolated, top));
    }

    private String registeredNode(UUID actorId, Map<UUID, Actor> actorById, Map<String, NetworkDto.Node> nodes) {
        if (actorId == null) {
            return null;
        }
        String id = actorId.toString();
        if (!nodes.containsKey(id)) {
            Actor a = actorById.get(actorId);
            String label = a != null ? a.getName() : id;
            Integer type = a != null ? typeGroup(a.getActorType()) : null;
            String uid = a != null ? a.getActorUid() : null;
            nodes.put(id, new NetworkDto.Node(id, label, type, null, true, uid, 0));
        }
        return id;
    }

    private String unregisteredNode(Relationship e, Map<String, NetworkDto.Node> nodes) {
        String name = e.getTargetName();
        if (name == null || name.isBlank()) {
            return null;
        }
        String id = "u:" + name.trim().toLowerCase();
        nodes.computeIfAbsent(id, k ->
                new NetworkDto.Node(id, name.trim(), e.getTargetActorType(), e.getTargetLevel(), false, null, 0));
        return id;
    }

    /** Map the 12 registry actor types to the 5 BRD questionnaire groups (0.13). */
    private static Integer typeGroup(mz.gov.dpap.domain.ActorType t) {
        if (t == null) {
            return null;
        }
        return switch (t) {
            case PRODUCER_ASSOCIATION -> 2;
            case NGO, INTERNATIONAL_ORGANIZATION, COOPERATION_AGENCY,
                 RESEARCH_INSTITUTION, EDUCATIONAL_INSTITUTION -> 3;
            case PRIVATE_COMPANY -> 4;
            case PUBLIC_INSTITUTION -> 5;
            default -> 1; // PRODUCER, LIVESTOCK_PRODUCER, FISHERIES_ACTOR, AQUACULTURE_ACTOR
        };
    }

    private static boolean containsCode(String csv, int code) {
        if (csv == null || csv.isBlank()) {
            return false;
        }
        for (String part : csv.split(",")) {
            if (part.trim().equals(String.valueOf(code))) {
                return true;
            }
        }
        return false;
    }
}
