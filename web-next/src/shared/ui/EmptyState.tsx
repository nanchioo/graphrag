type EmptyStateProps = {
  title: string;
  description?: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <section className="ui-card empty-state">
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
    </section>
  );
}
