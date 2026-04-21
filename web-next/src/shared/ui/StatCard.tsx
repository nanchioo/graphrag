type StatCardProps = {
  label: string;
  value: string;
  tone?: "brand" | "info" | "neutral" | "success";
};

export function StatCard({ label, value, tone = "neutral" }: StatCardProps) {
  return (
    <section className={`ui-card stat-card tone-${tone}`}>
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">{value}</div>
    </section>
  );
}
