export const CLASSES = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];

export function formatNaira(amountInNaira) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amountInNaira);
}

export function formatDate(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function statusBadgeClass(status) {
  if (status === 'success') return 'badge badge-success';
  if (status === 'failed') return 'badge badge-failed';
  return 'badge badge-pending';
}
