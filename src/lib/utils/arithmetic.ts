// Kept in sync with expense-tracker-bot/src/arithmetic.ts (the WhatsApp bot).
// Safe evaluator for a deliberately tiny grammar — digits and + - * / only,
// no parentheses, no functions, no identifiers. Never use eval()/Function()
// on chat-message text; this hand-rolled recursive-descent parser can only
// ever produce a number or fail, there's no way to make it execute anything.
export function evaluateArithmetic(expr: string): number | null {
  // Deliberately not pre-stripping whitespace: matching directly lets a bare
  // space between two numbers (e.g. "5 5", almost certainly a typo, not "55")
  // correctly leave two separate tokens with nothing joining them, which the
  // parser below then rejects as malformed — instead of silently merging
  // them into one number.
  const tokens = expr.match(/\d+\.?\d*|[+\-*/]/g);
  if (!tokens || tokens.length === 0) return null;

  let pos = 0;
  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  function parseNumber(): number | null {
    const tok = consume();
    if (tok === undefined) return null;
    const n = Number(tok);
    return Number.isNaN(n) ? null : n;
  }

  // Handles a leading unary +/- (e.g. "-20" as a standalone correction).
  function parseFactor(): number | null {
    if (peek() === '-') {
      consume();
      const value = parseFactor();
      return value === null ? null : -value;
    }
    if (peek() === '+') {
      consume();
      return parseFactor();
    }
    return parseNumber();
  }

  // * and / bind tighter than + and -, same as normal math.
  function parseTerm(): number | null {
    let value = parseFactor();
    if (value === null) return null;
    while (peek() === '*' || peek() === '/') {
      const op = consume();
      const rhs = parseFactor();
      if (rhs === null) return null;
      value = op === '*' ? value * rhs : value / rhs;
    }
    return value;
  }

  function parseExpr(): number | null {
    let value = parseTerm();
    if (value === null) return null;
    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const rhs = parseTerm();
      if (rhs === null) return null;
      value = op === '+' ? value + rhs : value - rhs;
    }
    return value;
  }

  const result = parseExpr();
  if (pos !== tokens.length) return null; // leftover tokens = malformed expression
  return result;
}
