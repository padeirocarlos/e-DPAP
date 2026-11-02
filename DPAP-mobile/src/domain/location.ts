/**
 * Maputo Province territorial hierarchy: District → Administrative Post →
 * Locality. Codes mirror DPAP-web and the backend seed exactly (the wire
 * contract). Bundled with the app so it is fully available offline; to be
 * completed from the official register.
 */

export type Locality = { code: string; name: string };
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
    administrativePosts: [{ code: "NAM-SED", name: "Namaacha-Sede", localities: [] }],
  },
];

export const DISTRICT_BY_CODE = new Map(DISTRICTS.map((d) => [d.code, d]));

export function getDistrict(code: string): District | undefined {
  return DISTRICT_BY_CODE.get(code);
}

export function getPosts(districtCode: string): AdministrativePost[] {
  return DISTRICT_BY_CODE.get(districtCode)?.administrativePosts ?? [];
}

export function districtName(code: string): string {
  return DISTRICT_BY_CODE.get(code)?.name ?? code;
}
