import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatTime(timestamp) {
  if (!timestamp) return '';
  return format(new Date(timestamp), 'HH:mm');
}

export function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Last seen recently';
  return `Last seen ${formatDistanceToNow(new Date(timestamp), { addSuffix: true })}`;
}
