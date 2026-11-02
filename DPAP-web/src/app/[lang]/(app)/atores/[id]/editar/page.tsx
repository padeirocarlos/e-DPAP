import type { Metadata } from "next";
import { Suspense } from "react";
import { getDictionary } from "@/i18n/dictionary";
import { PageHeader } from "@/components/ui/page-header";
import { Loading } from "@/components/ui/loading";
import { RequirePermission } from "@/components/auth/require-permission";
import { EditActorLoader } from "@/components/actors/edit-actor-loader";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.actors.form.editTitle };
}

export default async function EditActorPage({
  params,
}: PageProps<"/[lang]/atores/[id]/editar">) {
  // `params` is request-time data; pass the promise into the loader (inside
  // <Suspense>) rather than awaiting it here, so the instant shell stays static.
  const dict = await getDictionary();

  return (
    <>
      <PageHeader title={dict.actors.form.editTitle} />
      <div className="max-w-3xl">
        <Suspense fallback={<Loading label={dict.common.states.loading} />}>
          <RequirePermission permission="actors:write">
            <EditActorLoader params={params} />
          </RequirePermission>
        </Suspense>
      </div>
    </>
  );
}
