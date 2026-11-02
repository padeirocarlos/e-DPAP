import { useCallback, useState } from "react";
import { dict, format } from "@/i18n";
import { appConfig } from "@/config/app";
import { getUser, clearSession, isAuthenticated } from "@/auth/session";
import { useSync } from "@/hooks/useSync";
import { Login } from "@/components/Login";
import { SyncBar } from "@/components/SyncBar";
import { ActorList } from "@/components/ActorList";
import { ActorForm } from "@/components/ActorForm";
import { InterviewList } from "@/components/InterviewList";
import { Interview } from "@/components/Interview";
import type { AuthUser } from "@/api/types";

type Tab = "interviews" | "actors";
type View =
  | { kind: "list" }
  | { kind: "new" }
  | { kind: "edit"; localId: string }
  | { kind: "interview-new" }
  | { kind: "interview-edit"; localId: string };

export function App() {
  const [user, setUser] = useState<AuthUser | null>(() =>
    isAuthenticated() ? getUser() : null,
  );

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  if (!user) return <Login onLoggedIn={setUser} />;
  // The sync controller lives here so it mounts (and first syncs) only once
  // authenticated — i.e. with a token available for the initial push + pull.
  return <AuthenticatedApp user={user} onLogout={logout} />;
}

function AuthenticatedApp({
  user,
  onLogout,
}: {
  user: AuthUser;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState<Tab>("interviews");
  const [view, setView] = useState<View>({ kind: "list" });
  const sync = useSync(onLogout);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-xl flex-col">
      <header className="sticky top-0 z-10 border-b border-black/10 bg-white/90 px-4 py-3 backdrop-blur dark:border-white/15 dark:bg-zinc-950/90">
        <div className="mz-flag-stripe -mx-4 -mt-3 mb-3 h-1" />
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 items-center rounded bg-emerald-700 px-2 text-sm font-semibold text-white">
              {appConfig.org.shortName}
            </span>
            <span className="text-sm font-medium">{dict.app.name}</span>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
          >
            {dict.auth.logout}
          </button>
        </div>
        <p className="mt-0.5 text-xs text-zinc-400">
          {format(dict.auth.signedInAs, { name: user.name })}
        </p>
      </header>

      <div className="border-b border-black/10 px-4 py-3 dark:border-white/15">
        <SyncBar sync={sync} />
      </div>

      {view.kind === "list" ? (
        <div className="flex gap-1 border-b border-black/10 px-4 dark:border-white/15">
          {(["interviews", "actors"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={
                "min-h-11 border-b-2 px-3 text-sm font-medium " +
                (tab === t
                  ? "border-emerald-600 text-emerald-700 dark:text-emerald-400"
                  : "border-transparent text-zinc-500")
              }
            >
              {t === "interviews" ? dict.nav.interviews : dict.nav.actorsTab}
            </button>
          ))}
        </div>
      ) : null}

      <main className="flex-1 px-4 py-4">
        {view.kind === "interview-new" || view.kind === "interview-edit" ? (
          <Interview
            localId={view.kind === "interview-edit" ? view.localId : undefined}
            onDone={() => setView({ kind: "list" })}
          />
        ) : view.kind === "new" || view.kind === "edit" ? (
          <ActorForm
            localId={view.kind === "edit" ? view.localId : undefined}
            onDone={() => setView({ kind: "list" })}
          />
        ) : tab === "interviews" ? (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h1 className="text-lg font-semibold">{dict.interviews.title}</h1>
              <button
                type="button"
                onClick={() => setView({ kind: "interview-new" })}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
              >
                {dict.interviews.new}
              </button>
            </div>
            <InterviewList onOpen={(localId) => setView({ kind: "interview-edit", localId })} />
          </>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h1 className="text-lg font-semibold">{dict.nav.title}</h1>
              <button
                type="button"
                onClick={() => setView({ kind: "new" })}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
              >
                {dict.nav.newActor}
              </button>
            </div>
            <ActorList onEdit={(localId) => setView({ kind: "edit", localId })} />
          </>
        )}
      </main>
    </div>
  );
}
