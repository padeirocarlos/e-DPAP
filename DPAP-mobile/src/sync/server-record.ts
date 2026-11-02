/**
 * Map an authoritative server `Actor` to the local row fields. Shared by the
 * push engine (`markSynced`) and the pull (`pullChanges`) so a record adopted
 * from the server always looks the same locally. Omits `localId` (the caller
 * supplies it) and the local-only GPS metadata (a Dexie merge-update keeps it).
 */

import type { LocalActor } from "@/db/db";
import type { Actor } from "@/api/types";

export type ServerLocalFields = Omit<
  LocalActor,
  "localId" | "gpsAccuracy" | "gpsCapturedAt"
>;

export function serverToLocalFields(server: Actor): ServerLocalFields {
  return {
    name: server.name,
    registrationNumber: server.registrationNumber,
    actorType: server.actorType,
    legalStatus: server.legalStatus,
    sector: server.sector,
    districtCode: server.districtCode,
    administrativePostCode: server.administrativePostCode,
    localityCode: server.localityCode,
    latitude: server.latitude,
    longitude: server.longitude,
    responsiblePerson: server.responsiblePerson,
    phone: server.phone,
    email: server.email,
    address: server.address,
    description: server.description,
    observations: server.observations,
    startDate: server.startDate,
    fundingType: server.fundingType,
    imageUrl: server.imageUrl,
    acronym: server.acronym,
    respondentSex: server.respondentSex,
    respondentAge: server.respondentAge,
    respondentEducation: server.respondentEducation,
    phoneAlt: server.phoneAlt,
    website: server.website,
    subsectors: server.subsectors,
    valueChainLinks: server.valueChainLinks,
    operationLevel: server.operationLevel,
    districtsOfOperation: server.districtsOfOperation,
    legalFormality: server.legalFormality,
    registrationDocs: server.registrationDocs,
    nuit: server.nuit,
    consent: server.consent,
    contactSharingConsent: server.contactSharingConsent,
    fundingSources: server.fundingSources,
    receivedCredit: server.receivedCredit,
    serverId: server.id,
    version: server.version,
    createdAt: server.createdAt,
    updatedAt: server.updatedAt,
    syncStatus: "SYNCED",
    syncError: undefined,
  };
}
