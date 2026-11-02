/**
 * Offline interview capture (BRD questionnaire). Renders the schema-driven
 * Questionnaire, autosaves every change to IndexedDB, and on submit validates
 * client-side then queues the interview for sync (`POST /submissions`). The
 * backend re-validates (BR-RT-2) and is the authority.
 */

import { useEffect, useRef, useState } from "react";
import { dict, format } from "@/i18n";
import { useForm, type Answers } from "@/form/use-form";
import { Questionnaire } from "@/form/form-ui";
import { schema } from "@/form/schema-model";
import {
  createDraft,
  getSubmission,
  saveAnswers,
  queueForSubmit,
  deleteSubmission,
} from "@/db/submissions-repo";

export function Interview({
  localId,
  onDone,
}: {
  localId?: string;
  onDone: () => void;
}) {
  const [loaded, setLoaded] = useState<{ localId: string; answers: Answers } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (localId) {
        const existing = await getSubmission(localId);
        if (existing && active) {
          setLoaded({ localId: existing.localId, answers: existing.answers as Answers });
          return;
        }
      }
      const draft = await createDraft(schema.meta.version);
      if (active) setLoaded({ localId: draft.localId, answers: {} });
    })();
    return () => {
      active = false;
    };
  }, [localId]);

  // Discard the current (unfinished) interview and start a fresh one in place.
  const restart = async () => {
    if (!window.confirm(dict.interviews.restartConfirm)) return;
    if (loaded) await deleteSubmission(loaded.localId);
    const draft = await createDraft(schema.meta.version);
    setLoaded({ localId: draft.localId, answers: {} });
  };

  if (!loaded) return <p className="text-sm text-zinc-500">…</p>;
  // `key` remounts Capture on restart so form + per-tab state reset cleanly.
  return (
    <Capture
      key={loaded.localId}
      localId={loaded.localId}
      initial={loaded.answers}
      onDone={onDone}
      onRestart={restart}
    />
  );
}

function Capture({
  localId,
  initial,
  onDone,
  onRestart,
}: {
  localId: string;
  initial: Answers;
  onDone: () => void;
  onRestart: () => void;
}) {
  const form = useForm(initial);
  const [step, setStep] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const firstRender = useRef(true);

  // Autosave the draft on every change (skip the initial mount).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    void saveAnswers(localId, form.answers);
  }, [localId, form.answers]);

  const submit = async () => {
    setAttempted(true);
    if (form.errors.length > 0) return;
    await queueForSubmit(localId, form.answers);
    onDone();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onRestart}
          className="rounded-lg border border-black/15 px-3 py-1.5 text-sm font-medium dark:border-white/20"
        >
          {dict.interviews.restart}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg px-3 py-1.5 text-sm text-zinc-500">
          {dict.common.actions.cancel}
        </button>
      </div>
      <Questionnaire
        form={form}
        labels={dict.form}
        step={step}
        onStepChange={setStep}
        onSubmit={submit}
        footer={
          attempted && form.errors.length > 0 ? (
            <div className="rounded-lg border border-red-500/40 bg-red-50 p-3 dark:bg-red-950/30">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                {dict.form.errorsTitle} · {format(dict.interviews.errorsCount, { n: form.errors.length })}
              </p>
              <ul className="mt-1 list-disc pl-5 text-xs text-red-700 dark:text-red-300">
                {form.errors.slice(0, 6).map((e) => (
                  <li key={e.var}>{e.message_pt}</li>
                ))}
              </ul>
            </div>
          ) : null
        }
      />
    </div>
  );
}
