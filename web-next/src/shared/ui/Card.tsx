import type { PropsWithChildren } from "react";

type CardProps = PropsWithChildren<{
  title?: string;
}>;

export function Card({ title, children }: CardProps) {
  return (
    <section className="ui-card">
      {title ? <div className="ui-card-title">{title}</div> : null}
      <div>{children}</div>
    </section>
  );
}
