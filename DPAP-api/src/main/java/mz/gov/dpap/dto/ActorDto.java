package mz.gov.dpap.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import mz.gov.dpap.domain.ActorType;
import mz.gov.dpap.domain.FundingType;
import mz.gov.dpap.domain.LegalStatus;
import mz.gov.dpap.domain.Sector;
import mz.gov.dpap.domain.SyncStatus;

/** Full actor record incl. the sync envelope. */
public record ActorDto(
        String id,
        long version,
        Instant createdAt,
        Instant updatedAt,
        SyncStatus syncStatus,
        String name,
        String registrationNumber,
        ActorType actorType,
        LegalStatus legalStatus,
        Sector sector,
        String districtCode,
        String administrativePostCode,
        String localityCode,
        double latitude,
        double longitude,
        String responsiblePerson,
        String phone,
        String email,
        String address,
        String description,
        String observations,
        LocalDate startDate,
        FundingType fundingType,
        String imageUrl,
        String acronym,
        String respondentSex,
        Integer respondentAge,
        String respondentEducation,
        String phoneAlt,
        String website,
        List<String> subsectors,
        List<String> valueChainLinks,
        String operationLevel,
        List<String> districtsOfOperation,
        String legalFormality,
        List<String> registrationDocs,
        String nuit,
        Boolean consent,
        Boolean contactSharingConsent,
        List<String> fundingSources,
        Boolean receivedCredit) {}
