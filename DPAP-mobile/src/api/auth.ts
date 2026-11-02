/** Authentication — login against the backend to obtain a JWT. */

import { http } from "@/api/http";
import type { LoginResponse } from "@/api/types";

export function login(email: string, password: string): Promise<LoginResponse> {
  // No bearer yet — pass null so the client doesn't attach a stale token.
  return http.post<LoginResponse>("/auth/login", { email, password }, { token: null });
}
