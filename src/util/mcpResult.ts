export interface McpTextResult {
  // The SDK's CallToolResult schema is a "loose" object (extra keys allowed);
  // without this index signature, TS won't accept our literal as assignable
  // to it, even though the fields we set are exactly the ones it expects.
  [x: string]: unknown;
  content: { type: "text"; text: string }[];
  isError?: boolean;
}

export function textResult(text: string): McpTextResult {
  return { content: [{ type: "text", text }] };
}

export function jsonResult(data: unknown): McpTextResult {
  return textResult(JSON.stringify(data, null, 2));
}

export function errorResult(message: string): McpTextResult {
  return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
