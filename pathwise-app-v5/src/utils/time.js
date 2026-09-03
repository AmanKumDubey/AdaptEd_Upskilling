export function formatRelativeTime(iso) {
  if (!iso) return null;
  const diffMs = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diffMs)) return null;

  const days = Math.floor(diffMs / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;

  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? "s" : ""} ago`;
}
