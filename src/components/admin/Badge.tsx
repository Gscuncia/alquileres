interface PropertyStateBadgeProps {
  published: boolean;
}

export function PropertyStateBadge({ published }: PropertyStateBadgeProps) {
  if (published) {
    return (
      <span className="inline-flex items-center rounded-full bg-sky px-3 py-1 text-badge font-semibold text-ink">
        Publicada
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-hairline bg-surface-soft px-3 py-1 text-badge font-semibold text-muted">
      No publicada
    </span>
  );
}
