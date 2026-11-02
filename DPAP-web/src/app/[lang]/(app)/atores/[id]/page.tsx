import { Suspense } from "react";
import { getDictionary } from "@/i18n/dictionary";
import { Loading } from "@/components/ui/loading";
import { RequirePermission } from "@/components/auth/require-permission";
import { ActorDetailLoader } from "@/components/actors/actor-detail-loader";

export default async function ActorDetailPage({
  params,
}: PageProps<"/[lang]/atores/[id]">) {
  // Do NOT await `params` here: it is request-time (dynamic) URL data, and
  // reading it outside the <Suspense> boundary would prevent Next 16 (Cache
  // Components / PPR) from producing the static "instant shell". Pass the
  // promise into the loader, which awaits it inside the boundary.
  const dict = await getDictionary();

  return (
    <Suspense fallback={<Loading label={dict.common.states.loading} />}>
      <RequirePermission permission="actors:read">
        <ActorDetailLoader params={params} />
      </RequirePermission>
    </Suspense>
  );
}
