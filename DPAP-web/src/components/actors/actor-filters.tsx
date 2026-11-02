"use client";

/**
 * List filter controls. State lives in the URL (shareable, back-button
 * friendly): selects update it immediately, the search box is debounced. The
 * server `ActorsTable` re-renders from the new search params.
 *
 * Uses `useSearchParams`, so the page wraps it in a <Suspense> boundary.
 */

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDictionary } from "@/i18n/provider";
import { appConfig } from "@/config/app.config";
import { controlClass } from "@/components/ui/field";
import { FILTER_KEYS } from "@/lib/actors/filter-params";
import { DISTRICTS } from "@/lib/domain/location";
import { SECTOR_CODES, ACTOR_TYPE_CODES } from "@/lib/domain/enums";

export function ActorFilters() {
  const dict = useDictionary();
  const f = dict.actors.filters;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = (key: string) => searchParams.get(key) ?? "";
  const [search, setSearch] = useState(current(FILTER_KEYS.q));

  // Same control styling, auto width for inline selects.
  const selectClass = controlClass.replace("w-full", "w-auto");

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Debounce the search box into the URL.
  useEffect(() => {
    const handle = setTimeout(() => {
      if (search !== (searchParams.get(FILTER_KEYS.q) ?? "")) {
        setParam(FILTER_KEYS.q, search);
      }
    }, appConfig.listFilterDebounceMs);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const hasAny =
    searchParams.has(FILTER_KEYS.q) ||
    searchParams.has(FILTER_KEYS.district) ||
    searchParams.has(FILTER_KEYS.sector) ||
    searchParams.has(FILTER_KEYS.type);

  const clearAll = () => {
    setSearch("");
    router.replace(pathname, { scroll: false });
  };

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-48">
        <label htmlFor="filter-q" className="sr-only">
          {f.searchPlaceholder}
        </label>
        <input
          id="filter-q"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={f.searchPlaceholder}
          className={controlClass}
        />
      </div>

      <select
        aria-label={f.district}
        value={current(FILTER_KEYS.district)}
        onChange={(e) => setParam(FILTER_KEYS.district, e.target.value)}
        className={selectClass}
      >
        <option value="">{f.allDistricts}</option>
        {DISTRICTS.map((d) => (
          <option key={d.code} value={d.code}>
            {d.name}
          </option>
        ))}
      </select>

      <select
        aria-label={f.sector}
        value={current(FILTER_KEYS.sector)}
        onChange={(e) => setParam(FILTER_KEYS.sector, e.target.value)}
        className={selectClass}
      >
        <option value="">{f.allSectors}</option>
        {SECTOR_CODES.map((code) => (
          <option key={code} value={code}>
            {dict.domain.sector[code]}
          </option>
        ))}
      </select>

      <select
        aria-label={f.actorType}
        value={current(FILTER_KEYS.type)}
        onChange={(e) => setParam(FILTER_KEYS.type, e.target.value)}
        className={selectClass}
      >
        <option value="">{f.allTypes}</option>
        {ACTOR_TYPE_CODES.map((code) => (
          <option key={code} value={code}>
            {dict.domain.actorType[code]}
          </option>
        ))}
      </select>

      {hasAny ? (
        <button
          type="button"
          onClick={clearAll}
          className="rounded-md border border-black/15 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-black/5 dark:border-white/20 dark:text-zinc-300 dark:hover:bg-white/10"
        >
          {f.clear}
        </button>
      ) : null}
    </div>
  );
}
