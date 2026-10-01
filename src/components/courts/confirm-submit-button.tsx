"use client";

export function ConfirmSubmitButton({ children, message }: { children: React.ReactNode; message: string }) {
  return (
    <button
      className="text-action text-action--danger"
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
      type="submit"
    >
      {children}
    </button>
  );
}
