export function formatPrice(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return String(value);
  }

  return `${new Intl.NumberFormat('vi-VN').format(numericValue)} VND`;
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(value));
}

export function formatAddress(address: unknown) {
  if (!address || typeof address !== 'object') {
    return '-';
  }

  const data = address as Record<string, unknown>;

  return [data.line1, data.line2, data.city, data.province, data.postalCode, data.countryCode].filter(Boolean).join(', ');
}
