"use client";

/**
 * Administrator user management: list + create/edit/delete via Server Actions.
 * After each mutation it refreshes the server-rendered list (`router.refresh()`).
 * Email is immutable on edit; password is optional on edit (reset only).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDictionary } from "@/i18n/provider";
import { normalizeRole } from "@/lib/auth/permissions";
import { Field, controlClass } from "@/components/ui/field";
import { format } from "@/i18n/format";
import {
  createUserAction,
  updateUserAction,
  deleteUserAction,
} from "@/lib/actions/users";
import type { UserAdmin, UserRole } from "@/lib/api/types";

const ROLES: UserRole[] = [
  "SYS_ADMIN",
  "DATA_MANAGER",
  "SUPERVISOR",
  "ENUMERATOR",
  "ANALYST",
  "PARTNER",
];

type FormMode = { kind: "create" } | { kind: "edit"; user: UserAdmin };

export function UsersAdmin({ users }: { users: UserAdmin[] }) {
  const dict = useDictionary();
  const t = dict.admin.users;
  const router = useRouter();

  const [mode, setMode] = useState<FormMode | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const roleLabel = (role: UserRole) => {
    const code = normalizeRole(role);
    return code ? dict.roles[code] : role;
  };

  const handleDelete = async (id: string) => {
    const res = await deleteUserAction(id);
    setConfirmingId(null);
    if (res.ok) {
      setNotice(null);
      router.refresh();
    } else {
      setNotice(t.deleteError);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t.title}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
        </div>
        {mode === null ? (
          <button
            type="button"
            onClick={() => {
              setNotice(null);
              setMode({ kind: "create" });
            }}
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            {t.newUser}
          </button>
        ) : null}
      </div>

      {notice ? (
        <p role="alert" className="text-sm text-red-600">
          {notice}
        </p>
      ) : null}

      {mode ? (
        <UserForm
          mode={mode}
          onClose={() => setMode(null)}
          onSaved={(message) => {
            setMode(null);
            setNotice(null);
            router.refresh();
            // Success message is transient; surfaced inline by the form itself.
            void message;
          }}
        />
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-black/10 bg-white dark:border-white/15 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 text-xs uppercase text-zinc-500 dark:border-white/15">
            <tr>
              <th className="px-4 py-3 font-medium">{t.columns.name}</th>
              <th className="px-4 py-3 font-medium">{t.columns.email}</th>
              <th className="px-4 py-3 font-medium">{t.columns.role}</th>
              <th className="px-4 py-3 font-medium">{t.columns.status}</th>
              <th className="px-4 py-3 text-right font-medium">{t.columns.actions}</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                  {t.empty}
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-black/5 last:border-0 dark:border-white/10">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{roleLabel(u.role)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        u.enabled
                          ? "rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "rounded bg-zinc-200 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }
                    >
                      {u.enabled ? t.status.enabled : t.status.disabled}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {confirmingId === u.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDelete(u.id)}
                            className="rounded bg-red-700 px-2 py-1 text-xs font-medium text-white hover:bg-red-800"
                          >
                            {dict.common.actions.confirm}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingId(null)}
                            className="rounded px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10"
                          >
                            {dict.common.actions.cancel}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setNotice(null);
                              setMode({ kind: "edit", user: u });
                            }}
                            className="rounded px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
                          >
                            {dict.common.actions.edit}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingId(u.id)}
                            title={format(t.deleteConfirm, { name: u.name })}
                            className="rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                          >
                            {dict.common.actions.delete}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserForm({
  mode,
  onClose,
  onSaved,
}: {
  mode: FormMode;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const dict = useDictionary();
  const t = dict.admin.users;
  const isEdit = mode.kind === "edit";
  const initial = isEdit ? mode.user : null;

  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [role, setRole] = useState<UserRole>(initial?.role ?? "ENUMERATOR");
  const [password, setPassword] = useState("");
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleLabel = (r: UserRole) => {
    const code = normalizeRole(r);
    return code ? dict.roles[code] : r;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const res = isEdit
      ? await updateUserAction(mode.user.id, {
          name,
          role,
          enabled,
          password: password || undefined,
        })
      : await createUserAction({ name, email, role, password });
    setSubmitting(false);
    if (res.ok) {
      onSaved(isEdit ? t.updated : t.created);
    } else {
      setError(res.code === "CONFLICT" ? t.conflictError : t.saveError);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-lg border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-900"
    >
      <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
        {isEdit ? t.form.editTitle : t.form.createTitle}
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="u-name" label={t.form.name} required>
          <input
            id="u-name"
            className={controlClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>
        <Field
          id="u-email"
          label={t.form.email}
          required={!isEdit}
          hint={isEdit ? t.form.emailImmutable : undefined}
        >
          <input
            id="u-email"
            type="email"
            className={controlClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isEdit}
            required={!isEdit}
          />
        </Field>
        <Field id="u-role" label={t.form.role} required>
          <select
            id="u-role"
            className={controlClass}
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
        </Field>
        <Field
          id="u-password"
          label={t.form.password}
          required={!isEdit}
          hint={isEdit ? t.form.passwordEditHint : t.form.passwordHint}
        >
          <input
            id="u-password"
            type="password"
            className={controlClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!isEdit}
            autoComplete="new-password"
          />
        </Field>
      </div>

      {isEdit ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          {t.form.enabled}
        </label>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {submitting ? dict.common.states.saving : dict.common.actions.save}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-black/5 dark:border-white/20 dark:text-zinc-300 dark:hover:bg-white/10"
        >
          {dict.common.actions.cancel}
        </button>
      </div>
    </form>
  );
}
