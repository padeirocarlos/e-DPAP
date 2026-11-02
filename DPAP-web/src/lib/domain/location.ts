/**
 * Administrative geography for Maputo Province.
 *
 * Location names are proper nouns (not translated). This is seed reference data
 * for the hierarchy Province → District → Administrative Post → Locality; the
 * administration module will eventually manage it from the database. Codes are
 * stable; names are display values.
 *
 * NOTE: the locality lists below are an initial, non-exhaustive seed and should
 * be completed from the official DPAP territorial register.
 */

export type Locality = {
  code: string;
  name: string;
};

export type AdministrativePost = {
  code: string;
  name: string;
  localities: Locality[];
};

export type District = {
  code: string;
  name: string;
  administrativePosts: AdministrativePost[];
};

export const PROVINCE = { code: "MZ-L", name: "Maputo" } as const;

export const DISTRICTS: District[] = [
  {
    code: "BOA",
    name: "Boane",
    administrativePosts: [
      { code: "BOA-SED", name: "Boane-Sede", localities: [] },
      { code: "BOA-MAT", name: "Matola-Rio", localities: [] },
    ],
  },
  {
    code: "MAG",
    name: "Magude",
    administrativePosts: [
      { code: "MAG-SED", name: "Magude-Sede", localities: [] },
      { code: "MAG-MAP", name: "Mapulanguene", localities: [] },
    ],
  },
  {
    code: "MAN",
    name: "Manhiça",
    administrativePosts: [
      { code: "MAN-SED", name: "Manhiça-Sede", localities: [] },
      { code: "MAN-XIN", name: "Xinavane", localities: [] },
    ],
  },
  {
    code: "MAR",
    name: "Marracuene",
    administrativePosts: [
      { code: "MAR-SED", name: "Marracuene-Sede", localities: [] },
      { code: "MAR-MAC", name: "Machubo", localities: [] },
    ],
  },
  {
    code: "MAT",
    name: "Matutuíne",
    administrativePosts: [
      { code: "MAT-SED", name: "Bela Vista", localities: [] },
      { code: "MAT-ZIT", name: "Zitundo", localities: [] },
    ],
  },
  {
    code: "MOA",
    name: "Moamba",
    administrativePosts: [
      { code: "MOA-SED", name: "Moamba-Sede", localities: [] },
      { code: "MOA-RES", name: "Ressano Garcia", localities: [] },
    ],
  },
  {
    code: "NAM",
    name: "Namaacha",
    administrativePosts: [
      { code: "NAM-SED", name: "Namaacha-Sede", localities: [] },
    ],
  },
];

/** Flat lookup of districts by code. */
export const DISTRICT_BY_CODE = new Map(DISTRICTS.map((d) => [d.code, d]));

export function getDistrict(code: string): District | undefined {
  return DISTRICT_BY_CODE.get(code);
}
