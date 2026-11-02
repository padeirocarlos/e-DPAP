import type { Metadata } from "next";
import { Suspense } from "react";
import { getDictionary } from "@/i18n/dictionary";
import { PageHeader } from "@/components/ui/page-header";
import { Loading } from "@/components/ui/loading";
import { RequirePermission } from "@/components/auth/require-permission";
import { ActorForm } from "@/components/actors/actor-form";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.actors.form.createTitle };
}

export default async function NewActorPage() {
  const dict = await getDictionary();

  return (
    <>
      <PageHeader title={dict.actors.form.createTitle} />
      <div className="max-w-3xl">
        <Suspense fallback={<Loading label={dict.common.states.loading} />}>
          <RequirePermission permission="actors:write">
            <ActorForm />
          </RequirePermission>
        </Suspense>
      </div>
    </>
  );
}
