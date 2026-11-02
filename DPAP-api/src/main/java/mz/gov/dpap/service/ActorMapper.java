package mz.gov.dpap.service;

import mz.gov.dpap.domain.Actor;
import mz.gov.dpap.dto.ActorDto;
import mz.gov.dpap.dto.ActorRequest;
import mz.gov.dpap.dto.ActorSummaryDto;

/** Entity <-> DTO mapping for actors. */
final class ActorMapper {

    private ActorMapper() {}

    static ActorSummaryDto toSummary(Actor a) {
        return new ActorSummaryDto(
                a.getId().toString(),
                a.getName(),
                a.getActorType(),
                a.getSector(),
                a.getDistrictCode(),
                a.getLatitude(),
                a.getLongitude(),
                a.getUpdatedAt());
    }

    static ActorDto toDto(Actor a) {
        return new ActorDto(
                a.getId().toString(),
                a.getVersion(),
                a.getCreatedAt(),
                a.getUpdatedAt(),
                a.getSyncStatus(),
                a.getName(),
                a.getRegistrationNumber(),
                a.getActorType(),
                a.getLegalStatus(),
                a.getSector(),
                a.getDistrictCode(),
                a.getAdministrativePostCode(),
                a.getLocalityCode(),
                a.getLatitude(),
                a.getLongitude(),
                a.getResponsiblePerson(),
                a.getPhone(),
                a.getEmail(),
                a.getAddress(),
                a.getDescription(),
                a.getObservations(),
                a.getStartDate(),
                a.getFundingType(),
                a.getImageUrl(),
                a.getAcronym(),
                a.getRespondentSex(),
                a.getRespondentAge(),
                a.getRespondentEducation(),
                a.getPhoneAlt(),
                a.getWebsite(),
                a.getSubsectors(),
                a.getValueChainLinks(),
                a.getOperationLevel(),
                a.getDistrictsOfOperation(),
                a.getLegalFormality(),
                a.getRegistrationDocs(),
                a.getNuit(),
                a.getConsent(),
                a.getContactSharingConsent(),
                a.getFundingSources(),
                a.getReceivedCredit());
    }

    /** Copy write-model fields onto an entity (never id/version/timestamps). */
    static void apply(Actor a, ActorRequest r) {
        a.setName(r.name().trim());
        a.setRegistrationNumber(blankToNull(r.registrationNumber()));
        a.setActorType(r.actorType());
        a.setLegalStatus(r.legalStatus());
        a.setSector(r.sector());
        a.setDistrictCode(r.districtCode());
        a.setAdministrativePostCode(r.administrativePostCode());
        a.setLocalityCode(blankToNull(r.localityCode()));
        a.setLatitude(r.latitude());
        a.setLongitude(r.longitude());
        a.setResponsiblePerson(blankToNull(r.responsiblePerson()));
        a.setPhone(blankToNull(r.phone()));
        a.setEmail(blankToNull(r.email()));
        a.setAddress(blankToNull(r.address()));
        a.setDescription(blankToNull(r.description()));
        a.setObservations(blankToNull(r.observations()));
        a.setStartDate(r.startDate());
        a.setFundingType(r.fundingType());
        a.setImageUrl(blankToNull(r.imageUrl()));
        a.setAcronym(blankToNull(r.acronym()));
        a.setRespondentSex(blankToNull(r.respondentSex()));
        a.setRespondentAge(r.respondentAge());
        a.setRespondentEducation(blankToNull(r.respondentEducation()));
        a.setPhoneAlt(blankToNull(r.phoneAlt()));
        a.setWebsite(blankToNull(r.website()));
        a.setSubsectors(r.subsectors());
        a.setValueChainLinks(r.valueChainLinks());
        a.setOperationLevel(blankToNull(r.operationLevel()));
        a.setDistrictsOfOperation(r.districtsOfOperation());
        a.setLegalFormality(blankToNull(r.legalFormality()));
        a.setRegistrationDocs(r.registrationDocs());
        a.setNuit(blankToNull(r.nuit()));
        a.setConsent(r.consent());
        a.setContactSharingConsent(r.contactSharingConsent());
        a.setFundingSources(r.fundingSources());
        a.setReceivedCredit(r.receivedCredit());
    }

    private static String blankToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
