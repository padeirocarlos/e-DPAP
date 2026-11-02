import Link from "next/link";
import type { ReactNode } from "react";
import type { Dictionary } from "@/i18n/dictionary";
import type { Locale } from "@/i18n/config";
import { format } from "@/i18n/format";
import { formatDate } from "@/lib/utils/format-date";
import { getDistrict, DISTRICTS } from "@/lib/domain/location";
import { routes } from "@/config/routes";
import type { Actor } from "@/lib/api/types";
import type {
  ActorTypeCode,
  SectorCode,
  LegalStatusCode,
  FundingTypeCode,
} from "@/lib/domain/enums";

/**
 * Read-only full-detail view of an actor. Renders every populated field grouped
 * into the same sections as the form; empty fields are hidden. Presentational
 * (no data fetching) — the loader supplies the actor + dictionary + locale.
 */
export function ActorDetail({
  actor,
  dict,
  locale,
}: {
  actor: Actor;
  dict: Dictionary;
  locale: Locale;
}) {
  const f = dict.actors.form;
  const d = dict.actors.detail;
  const dom = dict.domain;

  const districtName = (c?: string) => (c ? getDistrict(c)?.name ?? c : undefined);
  const postName = (district: string, code?: string) =>
    code
      ? getDistrict(district)?.administrativePosts.find((p) => p.code === code)?.name ?? code
      : undefined;
  const districtLabels = Object.fromEntries(DISTRICTS.map((x) => [x.code, x.name]));
  const many = (map: Record<string, string>, codes?: string[]) =>
    codes && codes.length ? codes.map((c) => map[c] ?? c).join(", ") : undefined;
  const yesNo = (v?: boolean) => (v === true ? d.yes : v === false ? d.no : undefined);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card title={f.sections.identification}>
        <Row label={f.fields.registrationNumber} value={actor.registrationNumber} />
        <Row label={f.fields.acronym} value={actor.acronym} />
        <Row label={f.fields.actorType} value={dom.actorType[actor.actorType as ActorTypeCode]} />
        <Row label={f.fields.legalStatus} value={dom.legalStatus[actor.legalStatus as LegalStatusCode]} />
        <Row label={f.fields.sector} value={dom.sector[actor.sector as SectorCode]} />
      </Card>

      <Card title={f.sections.profile}>
        <Row label={f.fields.responsiblePerson} value={actor.responsiblePerson} />
        <Row label={f.fields.respondentSex} value={actor.respondentSex ? dom.respondentSex[actor.respondentSex as keyof typeof dom.respondentSex] : undefined} />
        <Row label={f.fields.respondentAge} value={actor.respondentAge != null ? String(actor.respondentAge) : undefined} />
        <Row label={f.fields.respondentEducation} value={actor.respondentEducation ? dom.education[actor.respondentEducation as keyof typeof dom.education] : undefined} />
        <Row label={f.fields.consent} value={yesNo(actor.consent)} />
      </Card>

      <Card title={f.sections.location}>
        <Row label={f.fields.district} value={districtName(actor.districtCode)} />
        <Row label={f.fields.administrativePost} value={postName(actor.districtCode, actor.administrativePostCode)} />
        <Row label={f.fields.locality} value={actor.localityCode} />
        <Row
          label={d.coordinates}
          value={
            <span className="tabular-nums">
              {actor.latitude.toFixed(6)}, {actor.longitude.toFixed(6)}{" "}
              <Link href={routes.map(locale)} className="text-emerald-700 hover:underline dark:text-emerald-400">
                · {d.viewOnMap}
              </Link>
            </span>
          }
        />
      </Card>

      <Card title={f.sections.scope}>
        <Row label={f.fields.subsectors} value={many(dom.subsector, actor.subsectors)} />
        <Row label={f.fields.valueChainLinks} value={many(dom.valueChainLink, actor.valueChainLinks)} />
        <Row label={f.fields.operationLevel} value={actor.operationLevel ? dom.operationLevel[actor.operationLevel as keyof typeof dom.operationLevel] : undefined} />
        <Row label={f.fields.districtsOfOperation} value={many(districtLabels, actor.districtsOfOperation)} />
      </Card>

      <Card title={f.sections.legal}>
        <Row label={f.fields.legalFormality} value={actor.legalFormality ? dom.legalFormality[actor.legalFormality as keyof typeof dom.legalFormality] : undefined} />
        <Row label={f.fields.registrationDocs} value={many(dom.registrationDoc, actor.registrationDocs)} />
        <Row label={f.fields.nuit} value={actor.nuit} />
      </Card>

      <Card title={f.sections.contacts}>
        <Row label={f.fields.phone} value={actor.phone} />
        <Row label={f.fields.phoneAlt} value={actor.phoneAlt} />
        <Row label={f.fields.email} value={actor.email} />
        <Row label={f.fields.website} value={actor.website} />
        <Row label={f.fields.address} value={actor.address} />
        <Row label={f.fields.contactSharingConsent} value={yesNo(actor.contactSharingConsent)} />
      </Card>

      <Card title={f.sections.activity}>
        <Row label={f.fields.description} value={actor.description} />
        <Row label={f.fields.observations} value={actor.observations} />
        <Row label={f.fields.startDate} value={actor.startDate} />
        <Row label={f.fields.fundingType} value={actor.fundingType ? dom.fundingType[actor.fundingType as FundingTypeCode] : undefined} />
        {actor.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={actor.imageUrl}
            alt=""
            className="mt-1 max-h-48 rounded-md border border-black/10 object-cover dark:border-white/15"
          />
        ) : null}
      </Card>

      <Card title={f.sections.financing}>
        <Row label={f.fields.fundingSources} value={many(dom.fundingSource, actor.fundingSources)} />
        <Row label={f.fields.receivedCredit} value={yesNo(actor.receivedCredit)} />
      </Card>

      <Card title={d.metadata}>
        <Row label={d.createdAt} value={formatDate(actor.createdAt, locale)} />
        <Row label={d.updatedAt} value={formatDate(actor.updatedAt, locale)} />
        <Row label={d.version} value={String(actor.version)} />
        <Row label={format("{v}", { v: "ID" })} value={<code className="text-xs">{actor.id}</code>} />
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-900">
      <h2 className="mb-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">{title}</h2>
      <dl className="divide-y divide-black/5 dark:divide-white/10">{children}</dl>
    </section>
  );
}

/** One label/value row — renders nothing when the value is empty. */
function Row({ label, value }: { label: string; value?: ReactNode }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex gap-3 py-1.5 text-sm">
      <dt className="w-40 shrink-0 text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="min-w-0 flex-1 break-words">{value}</dd>
    </div>
  );
}
