/**
 * Mock report generation (DEV-ONLY). CSV only — the format the demo needs and
 * the one that needs no binary tooling. Column keys + order mirror the backend
 * `ReportService` so the contract (and column selection) is identical.
 */

import type { Actor } from "@/lib/api/types";

export const CSV_CONTENT_TYPE = "text/csv; charset=utf-8";

const join = (v?: string[]) => (v && v.length ? v.join("; ") : "");
const nz = (v: string | number | undefined | null) =>
  v === undefined || v === null ? "" : String(v);

type Column = { key: string; header: string; get: (a: Actor) => string };

/** Canonical column order — keys match the backend + the frontend chooser. */
export const REPORT_COLUMNS: Column[] = [
  { key: "name", header: "Nome", get: (a) => a.name },
  { key: "registrationNumber", header: "Nº de registo", get: (a) => nz(a.registrationNumber) },
  { key: "acronym", header: "Sigla", get: (a) => nz(a.acronym) },
  { key: "actorType", header: "Tipo", get: (a) => a.actorType },
  { key: "legalStatus", header: "Estatuto legal", get: (a) => a.legalStatus },
  { key: "sector", header: "Setor", get: (a) => a.sector },
  { key: "district", header: "Distrito", get: (a) => a.districtCode },
  { key: "administrativePost", header: "Posto administrativo", get: (a) => a.administrativePostCode },
  { key: "locality", header: "Localidade", get: (a) => nz(a.localityCode) },
  { key: "latitude", header: "Latitude", get: (a) => String(a.latitude) },
  { key: "longitude", header: "Longitude", get: (a) => String(a.longitude) },
  { key: "responsiblePerson", header: "Responsável", get: (a) => nz(a.responsiblePerson) },
  { key: "respondentSex", header: "Sexo do respondente", get: (a) => nz(a.respondentSex) },
  { key: "respondentAge", header: "Idade do respondente", get: (a) => nz(a.respondentAge) },
  { key: "phone", header: "Telemóvel", get: (a) => nz(a.phone) },
  { key: "phoneAlt", header: "Telefone alternativo", get: (a) => nz(a.phoneAlt) },
  { key: "email", header: "Email", get: (a) => nz(a.email) },
  { key: "website", header: "Website", get: (a) => nz(a.website) },
  { key: "address", header: "Endereço", get: (a) => nz(a.address) },
  { key: "operationLevel", header: "Nível de actuação", get: (a) => nz(a.operationLevel) },
  { key: "legalFormality", header: "Situação legal", get: (a) => nz(a.legalFormality) },
  { key: "nuit", header: "NUIT", get: (a) => nz(a.nuit) },
  { key: "subsectors", header: "Subsectores", get: (a) => join(a.subsectors) },
  { key: "valueChainLinks", header: "Elos da cadeia de valor", get: (a) => join(a.valueChainLinks) },
  { key: "startDate", header: "Data de início", get: (a) => nz(a.startDate) },
  { key: "fundingType", header: "Tipo de financiamento", get: (a) => nz(a.fundingType) },
  { key: "fundingSources", header: "Fontes de financiamento", get: (a) => join(a.fundingSources) },
  { key: "description", header: "Descrição", get: (a) => nz(a.description) },
  { key: "observations", header: "Observações", get: (a) => nz(a.observations) },
  { key: "imageUrl", header: "Imagem", get: (a) => nz(a.imageUrl) },
];

function cell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Build an actor-list CSV. `columns` (keys) filters/order-preserves; empty = all. */
export function buildActorsCsv(actors: Actor[], columns?: string[]): string {
  const cols =
    columns && columns.length
      ? REPORT_COLUMNS.filter((c) => columns.includes(c.key))
      : REPORT_COLUMNS;
  const chosen = cols.length ? cols : REPORT_COLUMNS;
  const lines = [
    chosen.map((c) => cell(c.header)).join(","),
    ...actors.map((a) => chosen.map((c) => cell(c.get(a))).join(",")),
  ];
  return "﻿" + lines.join("\r\n");
}
