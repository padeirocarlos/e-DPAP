"use client";

/**
 * Schema-driven interview capture for the back-office. Uses the shared
 * Questionnaire renderer + engine; each module (tab) is validated on "Seguinte"
 * (inside the renderer) and the whole form is re-validated on submit, which
 * calls the create Server Action (submit=true). The backend re-validates.
 *
 * "Recomeçar" discards an unfinished registration and starts a fresh one without
 * leaving the page; "Cancelar" returns to the list.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDictionary, useLocale } from "@/i18n/provider";
import { routes } from "@/config/routes";
import { useForm } from "@/form/use-form";
import { Questionnaire } from "@/form/form-ui";
import { createSubmissionAction } from "@/lib/actions/submissions";

export function NewSubmission() {
  const dict = useDictionary();
  const locale = useLocale();
  const router = useRouter();
  const form = useForm();
  const [step, setStep] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Bumping this key remounts the Questionnaire, clearing its per-tab "attempted"
  // state so a restarted registration starts completely clean.
  const [formKey, setFormKey] = useState(0);

  const submit = async () => {
    setAttempted(true);
    setError(null);
    if (form.errors.length > 0) {
      setError(dict.submissions.submitErrors);
      return;
    }
    setBusy(true);
    const res = await createSubmissionAction(form.answers, { submit: true });
    setBusy(false);
    if (res.ok) {
      router.push(routes.submissionDetail(locale, res.id));
    } else {
      setError(res.message ?? dict.submissions.createError);
    }
  };

  const restart = () => {
    if (!window.confirm(dict.submissions.restartConfirm)) return;
    form.setAnswers({});
    setStep(0);
    setAttempted(false);
    setError(null);
    setFormKey((k) => k + 1);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={restart}
          className="rounded-lg border border-black/15 px-3 py-1.5 text-sm font-medium dark:border-white/20"
        >
          {dict.submissions.restart}
        </button>
        <button
          type="button"
          onClick={() => router.push(routes.submissions(locale))}
          className="rounded-lg px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
        >
          {dict.common.actions.cancel}
        </button>
      </div>

      <Questionnaire
        key={formKey}
        form={form}
        labels={dict.form}
        step={step}
        onStepChange={setStep}
        onSubmit={submit}
        footer={
          <>
            {busy ? <p className="text-sm text-zinc-500">{dict.common.states.saving}</p> : null}
            {error ? (
              <div className="mt-2 rounded-lg border border-red-500/40 bg-red-50 p-3 dark:bg-red-950/30">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
                {attempted && form.errors.length > 0 ? (
                  <ul className="mt-1 list-disc pl-5 text-xs text-red-700 dark:text-red-300">
                    {form.errors.slice(0, 6).map((e) => (
                      <li key={e.var}>{e.message_pt}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </>
        }
      />
    </div>
  );
}
