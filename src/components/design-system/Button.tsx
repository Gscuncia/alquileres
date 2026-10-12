import React from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tertiary" | "ghost" | "pill";
  block?: boolean;
  asChild?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  block = false,
  asChild = false,
  children,
  className = "",
  ...rest
}) => {
  const base =
    "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink";
  const size = "h-12 px-6 text-button-md";

  const styles: Record<string, string> = {
    primary:
      "rounded-sm bg-primary text-on-primary hover:bg-primary-active disabled:bg-primary-disabled disabled:text-muted-soft disabled:cursor-not-allowed",
    secondary:
      "rounded-sm border border-ink bg-canvas text-ink hover:bg-surface-soft disabled:border-border-strong disabled:text-muted-soft disabled:cursor-not-allowed",
    tertiary:
      "rounded-sm text-ink underline-offset-2 hover:underline disabled:text-muted-soft disabled:cursor-not-allowed",
    ghost:
      "rounded-sm text-ink hover:bg-surface-soft disabled:text-muted-soft disabled:cursor-not-allowed",
    pill:
      "rounded-full border border-hairline bg-canvas text-ink hover:bg-surface-soft disabled:border-border-strong disabled:text-muted-soft disabled:cursor-not-allowed",
  };

  const classes = `${base} ${size} ${styles[variant]} ${block ? "w-full" : ""} ${className}`;

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      className: `${children.props.className ?? ""} ${classes}`.trim(),
      ...rest,
    });
  }

  return (
    <button
      type="button"
      className={classes}
      {...rest}
    >
      {children}
    </button>
  );
};
