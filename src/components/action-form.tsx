"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ActionState } from "@/lib/action";

type Props = {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
};

export function ActionForm({ action, children, className, resetOnSuccess = true }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className}>
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {state?.error && <p className="text-sm text-red-600 mt-2">{state.error}</p>}
      {state?.warning && <p className="text-sm text-amber-600 mt-2">{state.warning}</p>}
      {state?.ok && <p className="text-sm text-green-700 mt-2">{state.ok}</p>}
    </form>
  );
}
