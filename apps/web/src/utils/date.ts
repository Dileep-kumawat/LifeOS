export const formatDueDate = (dateString?: string | Date): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

  const time = date.getTime();

  if (time >= startOfToday.getTime() && time < startOfTomorrow.getTime()) {
    return 'Today';
  } else if (time >= startOfTomorrow.getTime() && time < startOfTomorrow.getTime() + 24 * 60 * 60 * 1000) {
    return 'Tomorrow';
  } else if (time >= startOfYesterday.getTime() && time < startOfToday.getTime()) {
    return 'Yesterday';
  }

  // Same year
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  // Different year
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

export const formatDuration = (minutes?: number): string => {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
};
