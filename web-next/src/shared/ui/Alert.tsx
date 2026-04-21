import type { PropsWithChildren } from "react";

type AlertProps = PropsWithChildren<{
  title: string;
}>;

export function Alert({ title, children }: AlertProps) {
  return (
    <section className="ui-alert">
      <strong>{title}</strong>
      <div>{children}</div>
    </section>
  );
}
