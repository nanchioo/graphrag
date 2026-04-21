import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>;

export function Button({ children, className = "", ...props }: ButtonProps) {
  return (
    <button {...props} className={`ui-button ${className}`.trim()}>
      {children}
    </button>
  );
}
