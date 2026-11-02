import type { Metadata } from "next";
import { Suspense } from "react";
import { getDictionary } from "@/i18n/dictionary";
import { PageHeader } from "@/components/ui/page-header";
import { Loading } from "@/components/ui/loading";
import { ActorMarkers } from "@/components/map/actor-markers";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.map.title };
}

export default async function MapPage() {
  const dict = await getDictionary();

  return (
    <>
      <PageHeader title={dict.map.title} subtitle={dict.map.subtitle} />
      <div className="h-[70vh]">
        <Suspense fallback={<Loading label={dict.map.loading} />}>
          <ActorMarkers />
        </Suspense>
      </div>
    </>
  );
}
