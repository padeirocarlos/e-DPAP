/**
 * Catalogue of actor-export columns offered by the report builder. Keys (and
 * order) match the backend `ReportService.COLUMNS` and the dev mock
 * `REPORT_COLUMNS`; the download forwards the selected keys as `columns=`.
 */
export type ReportColumn = { key: string; label: string };

export const REPORT_COLUMNS: ReportColumn[] = [
  { key: "name", label: "Nome" },
  { key: "registrationNumber", label: "Nº de registo" },
  { key: "acronym", label: "Sigla" },
  { key: "actorType", label: "Tipo" },
  { key: "legalStatus", label: "Estatuto legal" },
  { key: "sector", label: "Setor" },
  { key: "district", label: "Distrito" },
  { key: "administrativePost", label: "Posto administrativo" },
  { key: "locality", label: "Localidade" },
  { key: "latitude", label: "Latitude" },
  { key: "longitude", label: "Longitude" },
  { key: "responsiblePerson", label: "Responsável" },
  { key: "respondentSex", label: "Sexo do respondente" },
  { key: "respondentAge", label: "Idade do respondente" },
  { key: "phone", label: "Telemóvel" },
  { key: "phoneAlt", label: "Telefone alternativo" },
  { key: "email", label: "Email" },
  { key: "website", label: "Website" },
  { key: "address", label: "Endereço" },
  { key: "operationLevel", label: "Nível de actuação" },
  { key: "legalFormality", label: "Situação legal" },
  { key: "nuit", label: "NUIT" },
  { key: "subsectors", label: "Subsectores" },
  { key: "valueChainLinks", label: "Elos da cadeia de valor" },
  { key: "startDate", label: "Data de início" },
  { key: "fundingType", label: "Tipo de financiamento" },
  { key: "fundingSources", label: "Fontes de financiamento" },
  { key: "description", label: "Descrição" },
  { key: "observations", label: "Observações" },
  { key: "imageUrl", label: "Imagem" },
];

/** Default columns pre-selected in the builder (the most useful subset). */
export const DEFAULT_REPORT_COLUMNS = [
  "name",
  "actorType",
  "sector",
  "district",
  "administrativePost",
  "responsiblePerson",
  "phone",
  "email",
];
