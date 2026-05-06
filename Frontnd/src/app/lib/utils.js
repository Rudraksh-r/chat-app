import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatTime(timestamp) {
  if (!timestamp) return '';
  return format(new Date(timestamp), 'HH:mm');
}
