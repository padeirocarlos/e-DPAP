import { listUsers } from "@/lib/api/users";
import { getServerAuthToken } from "@/lib/auth/session";
import { UsersAdmin } from "@/components/admin/users-admin";

/**
 * Server component: fetches users with the session token and renders the admin
 * manager. Render inside a <Suspense> + RequirePermission boundary.
 */
export async function UsersLoader() {
  const token = await getServerAuthToken();
  const users = await listUsers({ token });
  return <UsersAdmin users={users} />;
}
