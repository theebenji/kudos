/** "User:<uuid>" base64 global id (Relay/Pothos) → the raw uuid that rich-text mentions store. */
export function rawId(globalId: string): string {
  const decoded = atob(globalId);
  const separator = decoded.indexOf(":");
  return separator === -1 ? globalId : decoded.slice(separator + 1);
}
