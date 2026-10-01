import { signInWithGoogle } from "@/app/auth/actions";

export function GoogleAuthButton({ enabled }: { enabled: boolean }) {
  return (
    <form action={signInWithGoogle}>
      <button className="google-button" disabled={!enabled} type="submit">
        <span aria-hidden="true">G</span>
        {enabled ? "Continuar con Google" : "Google disponible próximamente"}
      </button>
    </form>
  );
}
