"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ActionState } from "@/lib/action";
import { Notice } from "@/components/notice";

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
      {state?.error && <Notice tone="error" className="mt-2 w-full basis-full">{state.error}</Notice>}
      {state?.warning && <Notice tone="warning" className="mt-2 w-full basis-full">{state.warning}</Notice>}
      {state?.ok && <Notice tone="success" className="mt-2 w-full basis-full">{state.ok}</Notice>}
    </form>
  );
}
