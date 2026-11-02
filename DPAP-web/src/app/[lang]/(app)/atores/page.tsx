import type { Metadata } from "next";
import { Suspense } from "react";
import { getDictionary } from "@/i18n/dictionary";
import { PageHeader } from "@/components/ui/page-header";
import { Loading } from "@/components/ui/loading";
import { ActorsTable } from "@/components/actors/actors-table";
import { ActorFilters } from "@/components/actors/actor-filters";
import { NewActorButton } from "@/components/actors/new-actor-button";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.actors.title };
}

export default async function ActorsPage({
  searchParams,
}: PageProps<"/[lang]/atores">) {
  const dict = await getDictionary();

  return (
    <>
      <PageHeader
        title={dict.actors.title}
        subtitle={dict.actors.subtitle}
        actions={<NewActorButton />}
      />

      {/* useSearchParams needs a Suspense boundary */}
      <Suspense fallback={null}>
        <ActorFilters />
      </Suspense>

      {/* searchParams is request-time data; await it inside the boundary */}
      <Suspense fallback={<Loading label={dict.common.states.loading} />}>
        <ActorsTable searchParams={searchParams} />
      </Suspense>
    </>
  );
}
