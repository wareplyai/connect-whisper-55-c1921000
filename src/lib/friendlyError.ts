// Sanitize Supabase / Postgres errors so internal DB details (table names,
// column names, constraint names, SQL) never leak to end users.
type AnyErr = { message?: string; code?: string; details?: string; hint?: string } | null | undefined;

const FRIENDLY: Record<string, string> = {
  "23505": "This already exists. Please try a different value.",
  "23503": "Required related record is missing. Please refresh and try again.",
  "23502": "A required field is missing.",
  "23514": "Some values are not allowed.",
  "22P02": "Invalid value provided.",
  "42501": "You don't have permission to do that.",
  "PGRST301": "You don't have permission to do that.",
  "PGRST116": "Item not found.",
};

const FORBIDDEN_PATTERNS = [
  /violates foreign key constraint/i,
  /violates unique constraint/i,
  /violates check constraint/i,
  /violates not-null constraint/i,
  /violates row-level security/i,
  /relation .* does not exist/i,
  /column .* does not exist/i,
  /duplicate key value/i,
  /permission denied for/i,
  /constraint "/i,
  /table "/i,
  /column "/i,
  /schema "/i,
  /pg_/i,
  /\bsql\b/i,
];

export function friendlyError(err: AnyErr, fallback = "Something went wrong. Please try again."): string {
  if (!err) return fallback;
  const code = (err as any).code as string | undefined;
  if (code && FRIENDLY[code]) return FRIENDLY[code];

  const msg = (err.message || "").trim();
  if (!msg) return fallback;

  // If message looks like a raw DB/Postgres error, hide it.
  if (FORBIDDEN_PATTERNS.some((p) => p.test(msg))) return fallback;

  // Plain auth / network style messages — safe to show.
  return msg;
}
