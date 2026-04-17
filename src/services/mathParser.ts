export type ParseResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

// ── Tokenizer ────────────────────────────────────────────────

type OpKind = '+' | '-' | '*' | '/';

type Token =
  | { kind: 'number'; value: number }
  | { kind: OpKind }
  | { kind: 'end' };

function tokenize(input: string): Token[] | string {
  const s = input.replace(/,/g, '.').replace(/\s+/g, '');
  const tokens: Token[] = [];
  let i = 0;

  while (i < s.length) {
    const ch = s[i] as string;

    if ((ch >= '0' && ch <= '9') || ch === '.') {
      let numStr = '';
      let dots = 0;
      while (i < s.length && ((s[i]! >= '0' && s[i]! <= '9') || s[i] === '.')) {
        if (s[i] === '.') dots++;
        numStr += s[i++];
      }
      if (dots > 1) return `Invalid number "${numStr}"`;
      const n = Number(numStr);
      if (!isFinite(n)) return `Invalid number "${numStr}"`;
      tokens.push({ kind: 'number', value: n });
    } else if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      tokens.push({ kind: ch });
      i++;
    } else {
      return `Unexpected character "${ch}"`;
    }
  }

  tokens.push({ kind: 'end' });
  return tokens;
}

// ── Recursive-descent parser ─────────────────────────────────
//
//   expr → term  (('+' | '-') term)*
//   term → atom  (('*' | '/')  atom)*
//   atom → NUMBER

/**
 * Safely evaluates a simple arithmetic expression (+, -, *, /).
 * Supports correct operator precedence (* / before + -).
 * Treats commas as decimal separators. Does NOT use eval.
 *
 * Returns { ok: true, value } or { ok: false, error }.
 * An empty string returns { ok: false, error: '' } (no visible message).
 */
export function parseExpression(raw: string): ParseResult {
  const input = raw.trim();
  if (!input) return { ok: false, error: '' };

  const tokensOrError = tokenize(input);
  if (typeof tokensOrError === 'string') return { ok: false, error: tokensOrError };

  const tokens = tokensOrError;
  let pos = 0;

  const peek = (): Token => tokens[pos] ?? { kind: 'end' };
  const consume = (): Token => tokens[pos++] ?? { kind: 'end' };

  function expr(): number | string {
    let left = term();
    if (typeof left === 'string') return left;
    while (peek().kind === '+' || peek().kind === '-') {
      const op = consume().kind as OpKind;
      const right = term();
      if (typeof right === 'string') return right;
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function term(): number | string {
    let left = atom();
    if (typeof left === 'string') return left;
    while (peek().kind === '*' || peek().kind === '/') {
      const op = consume().kind as OpKind;
      const right = atom();
      if (typeof right === 'string') return right;
      if (op === '/' && right === 0) return 'Division by zero';
      left = op === '*' ? left * right : left / right;
    }
    return left;
  }

  function atom(): number | string {
    const tok = peek();
    if (tok.kind === 'number') { consume(); return tok.value; }
    if (tok.kind === 'end') return 'Expression is incomplete';
    return `Unexpected "${tok.kind}"`;
  }

  const value = expr();
  if (typeof value === 'string') return { ok: false, error: value };

  // Leftover tokens means the expression wasn't fully consumed
  if (peek().kind !== 'end') return { ok: false, error: 'Expression is incomplete' };
  if (!isFinite(value)) return { ok: false, error: 'Result is not a finite number' };
  if (value <= 0) return { ok: false, error: 'Amount must be greater than 0' };

  // Eliminate floating-point noise (e.g. 0.1 + 0.2 = 0.30000000000000004)
  return { ok: true, value: Math.round(value * 1e10) / 1e10 };
}
