export function safeInternalPath(value: string | null | undefined, fallback = '/') {
  return value?.startsWith('/') && !value.startsWith('//') ? value : fallback;
}
