"use client";

export function ConfirmSubmitButton({
  message,
  className,
  title,
  children,
}: {
  message: string;
  className?: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      title={title}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
