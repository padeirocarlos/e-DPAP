import { getActor } from "@/lib/api/actors";
import { getServerAuthToken } from "@/lib/auth/session";
import { ActorForm, type FormState } from "@/components/actors/actor-form";
import type { Actor } from "@/lib/api/types";

/**
 * Server component: loads an actor and renders the form prefilled for editing.
 * Reads the session token, so render inside a <Suspense> boundary; a missing
 * actor (NOT_FOUND) bubbles to the segment error boundary.
 */
export async function EditActorLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await getServerAuthToken();
  const actor = await getActor(id, { token });

  return (
    <ActorForm
      mode="edit"
      actorId={actor.id}
      version={actor.version}
      initial={toFormState(actor)}
    />
  );
}

function toFormState(a: Actor): FormState {
  return {
    name: a.name,
    registrationNumber: a.registrationNumber ?? "",
    actorType: a.actorType,
    legalStatus: a.legalStatus,
    sector: a.sector,
    districtCode: a.districtCode,
    administrativePostCode: a.administrativePostCode,
    localityCode: a.localityCode ?? "",
    latitude: String(a.latitude),
    longitude: String(a.longitude),
    responsiblePerson: a.responsiblePerson ?? "",
    phone: a.phone ?? "",
    email: a.email ?? "",
    address: a.address ?? "",
    description: a.description ?? "",
    observations: a.observations ?? "",
    startDate: a.startDate ?? "",
    fundingType: a.fundingType ?? "",
    imageUrl: a.imageUrl ?? "",
    acronym: a.acronym ?? "",
    respondentSex: a.respondentSex ?? "",
    respondentAge: a.respondentAge != null ? String(a.respondentAge) : "",
    respondentEducation: a.respondentEducation ?? "",
    phoneAlt: a.phoneAlt ?? "",
    website: a.website ?? "",
    subsectors: a.subsectors ?? [],
    valueChainLinks: a.valueChainLinks ?? [],
    operationLevel: a.operationLevel ?? "",
    districtsOfOperation: a.districtsOfOperation ?? [],
    legalFormality: a.legalFormality ?? "",
    registrationDocs: a.registrationDocs ?? [],
    nuit: a.nuit ?? "",
    consent: a.consent ?? false,
    contactSharingConsent: a.contactSharingConsent ?? false,
    fundingSources: a.fundingSources ?? [],
    receivedCredit: a.receivedCredit ?? false,
  };
}
