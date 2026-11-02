package mz.gov.dpap.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import mz.gov.dpap.domain.Actor;
import mz.gov.dpap.domain.ActorType;
import mz.gov.dpap.domain.AuditAction;
import mz.gov.dpap.domain.LegalStatus;
import mz.gov.dpap.domain.Sector;
import mz.gov.dpap.dto.ActorDto;
import mz.gov.dpap.dto.ActorRequest;
import mz.gov.dpap.repository.ActorRepository;
import mz.gov.dpap.service.exception.DuplicateActorException;
import mz.gov.dpap.service.exception.NotFoundException;
import mz.gov.dpap.service.exception.StaleVersionException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ActorServiceTest {

    @Mock ActorRepository repo;
    @Mock AuditService audit;
    @InjectMocks ActorService service;

    private static ActorRequest request(String name, String reg, Long version) {
        return new ActorRequest(name, reg, ActorType.PRODUCER, LegalStatus.INDIVIDUAL,
                Sector.AGRICULTURE, "BOA", "BOA-SED", null, -26.0, 32.3,
                null, null, null, null,
                null, null, null, null, null, // description/observations/startDate/fundingType/imageUrl
                // BRD profile: acronym, respondentSex/age/education, phoneAlt, website,
                // subsectors, valueChainLinks, operationLevel, districtsOfOperation,
                // legalFormality, registrationDocs, nuit, consent, contactSharingConsent,
                // fundingSources, receivedCredit
                null, null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null,
                version);
    }

    private static Actor existing(UUID id, long version) {
        Actor a = new Actor();
        a.setId(id);
        a.setName("Existente");
        a.setActorType(ActorType.PRODUCER);
        a.setLegalStatus(LegalStatus.INDIVIDUAL);
        a.setSector(Sector.AGRICULTURE);
        a.setDistrictCode("BOA");
        a.setAdministrativePostCode("BOA-SED");
        a.setLatitude(-26.0);
        a.setLongitude(32.3);
        a.setVersion(version);
        a.setCreatedAt(Instant.now());
        a.setUpdatedAt(Instant.now());
        return a;
    }

    @Test
    void create_persistsAndAudits() {
        when(repo.findFirstByNameIgnoreCaseAndDistrictCodeAndActorType(any(), any(), any()))
                .thenReturn(Optional.empty());
        when(repo.saveAndFlush(any(Actor.class))).thenAnswer(inv -> {
            Actor a = inv.getArgument(0);
            a.setId(UUID.randomUUID());
            a.setCreatedAt(Instant.now());
            a.setUpdatedAt(Instant.now());
            return a;
        });

        ActorDto dto = service.create(request("Nova Associação", null, null), "editor@dpap.gov.mz");

        assertThat(dto.name()).isEqualTo("Nova Associação");
        assertThat(dto.createdAt()).isNotNull();
        verify(audit).record(eq(AuditAction.CREATE), eq("ACTOR"), anyString(),
                eq("Nova Associação"), eq("editor@dpap.gov.mz"));
    }

    @Test
    void create_duplicateRegistrationNumber_throws() {
        when(repo.findFirstByRegistrationNumberIgnoreCase("R-1"))
                .thenReturn(Optional.of(existing(UUID.randomUUID(), 0)));

        assertThatThrownBy(() -> service.create(request("X", "R-1", null), "e"))
                .isInstanceOf(DuplicateActorException.class);
        verify(repo, never()).saveAndFlush(any());
    }

    @Test
    void update_staleVersion_throws() {
        UUID id = UUID.randomUUID();
        when(repo.findById(id)).thenReturn(Optional.of(existing(id, 3)));

        assertThatThrownBy(() -> service.update(id, request("X", null, 2L), "e"))
                .isInstanceOf(StaleVersionException.class);
        verify(repo, never()).saveAndFlush(any());
    }

    @Test
    void update_currentVersion_persistsAndAudits() {
        UUID id = UUID.randomUUID();
        Actor current = existing(id, 1);
        when(repo.findById(id)).thenReturn(Optional.of(current));
        // natural-key lookup returns the same record -> excluded by self-filter
        when(repo.findFirstByNameIgnoreCaseAndDistrictCodeAndActorType(any(), any(), any()))
                .thenReturn(Optional.of(current));
        when(repo.saveAndFlush(any(Actor.class))).thenAnswer(inv -> inv.getArgument(0));

        ActorDto dto = service.update(id, request("Editado", null, 1L), "editor@dpap.gov.mz");

        assertThat(dto.name()).isEqualTo("Editado");
        verify(audit).record(eq(AuditAction.UPDATE), eq("ACTOR"), eq(id.toString()),
                eq("Editado"), eq("editor@dpap.gov.mz"));
    }

    @Test
    void delete_missing_throws() {
        UUID id = UUID.randomUUID();
        when(repo.findById(id)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.delete(id, "admin"))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void delete_existing_audits() {
        UUID id = UUID.randomUUID();
        Actor current = existing(id, 0);
        when(repo.findById(id)).thenReturn(Optional.of(current));

        service.delete(id, "admin@dpap.gov.mz");

        verify(repo).delete(current);
        verify(audit).record(eq(AuditAction.DELETE), eq("ACTOR"), eq(id.toString()),
                anyString(), eq("admin@dpap.gov.mz"));
    }
}
