import { listAudit } from "@/lib/api/audit";
import { getServerAuthToken } from "@/lib/auth/session";
import { parseAuditFilters } from "@/lib/audit/filter-params";
import type { SearchParams } from "@/lib/actors/filter-params";
import { AuditViewer } from "@/components/admin/audit-viewer";

/**
 * Server component: parses audit filters from the URL, fetches the matching
 * page with the session token, and renders the viewer. Render inside a
 * <Suspense> + RequirePermission boundary (reads the request's searchParams and
 * the session cookie).
 */
export async function AuditLoader({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const filters = parseAuditFilters(searchParams ? await searchParams : {});
  const token = await getServerAuthToken();
  const result = await listAudit(filters, { token });
  return <AuditViewer result={result} />;
}
