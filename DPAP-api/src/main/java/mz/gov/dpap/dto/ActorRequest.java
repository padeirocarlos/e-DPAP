package mz.gov.dpap.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import mz.gov.dpap.domain.ActorType;
import mz.gov.dpap.domain.FundingType;
import mz.gov.dpap.domain.LegalStatus;
import mz.gov.dpap.domain.Sector;

/**
 * Actor write model. Mirrors the frontend's `ActorWriteModel`; `version` is
 * present only on update (optimistic concurrency) and ignored on create.
 */
public record ActorRequest(
        @NotBlank @Size(min = 3, max = 160) String name,
        @Size(max = 60) String registrationNumber,
        @NotNull ActorType actorType,
        @NotNull LegalStatus legalStatus,
        @NotNull Sector sector,
        @NotBlank String districtCode,
        @NotBlank String administrativePostCode,
        String localityCode,
        @NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
        @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude,
        @Size(max = 160) String responsiblePerson,
        @Size(max = 32) String phone,
        @Email @Size(max = 160) String email,
        @Size(max = 240) String address,
        @Size(max = 4000) String description,
        @Size(max = 4000) String observations,
        LocalDate startDate,
        FundingType fundingType,
        @Size(max = 512) String imageUrl,
        // --- BRD Module 0 / A / I profile (all optional) ---
        @Size(max = 255) String acronym,
        @Size(max = 16) String respondentSex,
        Integer respondentAge,
        @Size(max = 24) String respondentEducation,
        @Size(max = 32) String phoneAlt,
        @Size(max = 255) String website,
        List<String> subsectors,
        List<String> valueChainLinks,
        @Size(max = 24) String operationLevel,
        List<String> districtsOfOperation,
        @Size(max = 24) String legalFormality,
        List<String> registrationDocs,
        @Size(max = 9) String nuit,
        Boolean consent,
        Boolean contactSharingConsent,
        List<String> fundingSources,
        Boolean receivedCredit,
        Long version) {}
