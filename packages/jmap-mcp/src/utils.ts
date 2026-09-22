const prettyPrint = Deno.env.get("JMAP_MCP_DEBUG") === "true";

/** Serialize a value to JSON. Compact by default; pretty-printed when JMAP_MCP_DEBUG=true. */
export const jsonStringify = (value: unknown): string =>
  prettyPrint ? JSON.stringify(value, null, 2) : JSON.stringify(value);

export const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }
  return String(error);
};
