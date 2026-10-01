export type FormState = {
  status: "idle" | "error" | "success";
  message: string;
};

export const initialFormState: FormState = { status: "idle", message: "" };

export function AuthFeedback({ state }: { state: FormState }) {
  if (state.status === "idle" || !state.message) return null;

  return (
    <p className={`form-feedback form-feedback--${state.status}`} role={state.status === "error" ? "alert" : "status"}>
      {state.message}
    </p>
  );
}
