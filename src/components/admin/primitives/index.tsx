import React from "react";

export interface AdminFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}

interface AdminInputBaseProps {
  className?: string;
}

interface AdminInputInputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    AdminInputBaseProps {
  as?: "input";
}

interface AdminInputSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement>,
    AdminInputBaseProps {
  as: "select";
}

interface AdminInputTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    AdminInputBaseProps {
  as: "textarea";
}

export type AdminInputProps =
  | AdminInputInputProps
  | AdminInputSelectProps
  | AdminInputTextareaProps;

export interface AdminLabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export interface AdminErrorProps {
  message?: string;
}

export interface AdminPanelProps {
  title?: string;
  children: React.ReactNode;
}

export interface AdminEmptyStateProps {
  children: React.ReactNode;
  action?: React.ReactNode;
}

export interface AdminPageHeaderProps {
  title: string;
  action?: React.ReactNode;
}

const inputClasses =
  "w-full rounded-sm border border-hairline bg-canvas px-3 py-2 text-body-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary";

const labelClasses = "block text-caption-sm font-medium text-ink mb-1";

export function AdminField({
  label,
  htmlFor,
  error,
  children,
}: AdminFieldProps) {
  return (
    <div>
      <AdminLabel htmlFor={htmlFor}>{label}</AdminLabel>
      {children}
      <AdminError message={error} />
    </div>
  );
}

export function AdminInput({
  as = "input",
  className = "",
  ...rest
}: AdminInputProps) {
  const classes = `${inputClasses} ${className}`.trim();

  if (as === "select") {
    return <select className={classes} {...(rest as React.SelectHTMLAttributes<HTMLSelectElement>)} />;
  }

  if (as === "textarea") {
    return <textarea className={classes} {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} />;
  }

  return <input className={classes} {...(rest as React.InputHTMLAttributes<HTMLInputElement>)} />;
}

export function AdminLabel({ children, className = "", ...rest }: AdminLabelProps) {
  const classes = `${labelClasses} ${className}`.trim();
  return (
    <label className={classes} {...rest}>
      {children}
    </label>
  );
}

export function AdminError({ message }: AdminErrorProps) {
  if (!message) return null;
  return <p className="mt-1 text-caption-sm text-primary-error-text">{message}</p>;
}

export function AdminPanel({ title, children }: AdminPanelProps) {
  return (
    <section className="rounded-md border border-hairline bg-surface-card p-4 shadow-card">
      {title && (
        <h2 className="mb-4 text-display-sm font-semibold text-ink">{title}</h2>
      )}
      {children}
    </section>
  );
}

export function AdminEmptyState({ children, action }: AdminEmptyStateProps) {
  return (
    <div className="rounded-md border border-hairline bg-surface-soft p-6 text-body-md text-body">
      <div className="flex flex-col items-start gap-4">
        {children}
        {action}
      </div>
    </div>
  );
}

export function AdminPageHeader({ title, action }: AdminPageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-display-sm font-semibold text-ink">{title}</h1>
      {action}
    </div>
  );
}
