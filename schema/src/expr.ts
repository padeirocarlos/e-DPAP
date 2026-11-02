/**
 * e-DPAP relevance / constraint expression engine (BRD FR-FORM-3, FR-FORM-4).
 *
 * A small, sandboxed evaluator for the expression language the BRD Section 7/8
 * uses for module & field relevance (skip logic) and for constraints. It is the
 * single shared implementation the web app and the mobile PWA both use; the
 * Spring Boot backend gets a line-for-line Java port (tested against the same
 * fixtures) for server-side re-validation (NFR-9).
 *
 * Grammar (precedence low → high):
 *   or         := and ( "OR" and )*
 *   and        := not ( "AND" not )*
 *   not        := "NOT" not | comparison
 *   comparison := additive ( ( "=" | "!=" | "≠" | "<" | "<=" | ">" | ">="
 *                             | "IN" ) additive )?
 *   additive   := multiplicative ( ( "+" | "-" ) multiplicative )*
 *   multiplic. := unary ( ( "*" | "/" ) unary )*
 *   unary      := "-" unary | primary
 *   primary    := NUMBER | STRING | BOOL | IDENT | "(" exprList ")"
 *   exprList   := or ( "," or )*          // a parenthesised list is a set/tuple
 *
 * `IN` means membership: `x IN (1,2,4)` (literal set) or `1 IN qA_15`
 * (qA_15 is a select_multiple array). Equality is loose: numeric when both
 * sides are numeric, otherwise string. There is no `eval`, no property access,
 * no function calls — only the operators above over a flat variable context.
 */

export type ExprValue = number | string | boolean | null | undefined | Array<number | string>;

/** A flat map of questionnaire variable → answered value (e.g. `{ q0_13: 1, qA_15: [1,4] }`). */
export type EvalContext = Record<string, ExprValue>;

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

type TokType =
  | "num"
  | "str"
  | "ident"
  | "op"
  | "lparen"
  | "rparen"
  | "comma"
  | "eof";

interface Token {
  type: TokType;
  value: string;
  pos: number;
}

const KEYWORDS = new Set(["AND", "OR", "NOT", "IN", "TRUE", "FALSE"]);
// Multi-char operators must be tested before single-char ones.
const OPERATORS = ["<=", ">=", "!=", "≠", "=", "<", ">", "+", "-", "*", "/"];

export class ExprError extends Error {}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = input.length;

  while (i < n) {
    const c = input[i];

    if (c === " " || c === "\t" || c === "\n" || c === "\r") {
      i++;
      continue;
    }

    if (c === "(") {
      tokens.push({ type: "lparen", value: c, pos: i });
      i++;
      continue;
    }
    if (c === ")") {
      tokens.push({ type: "rparen", value: c, pos: i });
      i++;
      continue;
    }
    if (c === ",") {
      tokens.push({ type: "comma", value: c, pos: i });
      i++;
      continue;
    }

    // String literal (single or double quotes).
    if (c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      let str = "";
      while (j < n && input[j] !== quote) {
        if (input[j] === "\\" && j + 1 < n) {
          str += input[j + 1];
          j += 2;
        } else {
          str += input[j];
          j++;
        }
      }
      if (j >= n) throw new ExprError(`Unterminated string at ${i}`);
      tokens.push({ type: "str", value: str, pos: i });
      i = j + 1;
      continue;
    }

    // Number literal (integer or decimal). A leading '-' is handled as a unary
    // operator by the parser so that `a-b` tokenises as subtraction.
    if (c >= "0" && c <= "9") {
      let j = i;
      while (j < n && ((input[j] >= "0" && input[j] <= "9") || input[j] === ".")) j++;
      tokens.push({ type: "num", value: input.slice(i, j), pos: i });
      i = j;
      continue;
    }

    // Operators.
    let matchedOp = false;
    for (const op of OPERATORS) {
      if (input.startsWith(op, i)) {
        tokens.push({ type: "op", value: op, pos: i });
        i += op.length;
        matchedOp = true;
        break;
      }
    }
    if (matchedOp) continue;

    // Identifier / keyword. Variable keys look like q0_12, qA_15, qA_15_other.
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < n && /[A-Za-z0-9_]/.test(input[j])) j++;
      const raw = input.slice(i, j);
      const upper = raw.toUpperCase();
      if (KEYWORDS.has(upper)) {
        tokens.push({ type: "op", value: upper, pos: i });
      } else {
        tokens.push({ type: "ident", value: raw, pos: i });
      }
      i = j;
      continue;
    }

    throw new ExprError(`Unexpected character '${c}' at ${i}`);
  }

  tokens.push({ type: "eof", value: "", pos: n });
  return tokens;
}

// ---------------------------------------------------------------------------
// AST
// ---------------------------------------------------------------------------

type Node =
  | { kind: "num"; value: number }
  | { kind: "str"; value: string }
  | { kind: "bool"; value: boolean }
  | { kind: "var"; name: string }
  | { kind: "list"; items: Node[] }
  | { kind: "unary"; op: string; operand: Node }
  | { kind: "binary"; op: string; left: Node; right: Node };

// ---------------------------------------------------------------------------
// Parser (recursive descent)
// ---------------------------------------------------------------------------

class Parser {
  private pos = 0;
  constructor(private readonly tokens: Token[]) {}

  parse(): Node {
    const node = this.parseOr();
    this.expect("eof");
    return node;
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }
  private next(): Token {
    return this.tokens[this.pos++];
  }
  private isOp(value: string): boolean {
    const t = this.peek();
    return t.type === "op" && t.value === value;
  }
  private expect(type: TokType): Token {
    const t = this.peek();
    if (t.type !== type) throw new ExprError(`Expected ${type} but found '${t.value}' at ${t.pos}`);
    return this.next();
  }

  private parseOr(): Node {
    let left = this.parseAnd();
    while (this.isOp("OR")) {
      this.next();
      left = { kind: "binary", op: "OR", left, right: this.parseAnd() };
    }
    return left;
  }

  private parseAnd(): Node {
    let left = this.parseNot();
    while (this.isOp("AND")) {
      this.next();
      left = { kind: "binary", op: "AND", left, right: this.parseNot() };
    }
    return left;
  }

  private parseNot(): Node {
    if (this.isOp("NOT")) {
      this.next();
      return { kind: "unary", op: "NOT", operand: this.parseNot() };
    }
    return this.parseComparison();
  }

  private parseComparison(): Node {
    const left = this.parseAdditive();
    const t = this.peek();
    if (
      t.type === "op" &&
      ["=", "!=", "≠", "<", "<=", ">", ">=", "IN"].includes(t.value)
    ) {
      this.next();
      const right = this.parseAdditive();
      return { kind: "binary", op: t.value, left, right };
    }
    return left;
  }

  private parseAdditive(): Node {
    let left = this.parseMultiplicative();
    while (this.isOp("+") || this.isOp("-")) {
      const op = this.next().value;
      left = { kind: "binary", op, left, right: this.parseMultiplicative() };
    }
    return left;
  }

  private parseMultiplicative(): Node {
    let left = this.parseUnary();
    while (this.isOp("*") || this.isOp("/")) {
      const op = this.next().value;
      left = { kind: "binary", op, left, right: this.parseUnary() };
    }
    return left;
  }

  private parseUnary(): Node {
    if (this.isOp("-")) {
      this.next();
      return { kind: "unary", op: "-", operand: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Node {
    const t = this.peek();

    if (t.type === "num") {
      this.next();
      return { kind: "num", value: Number(t.value) };
    }
    if (t.type === "str") {
      this.next();
      return { kind: "str", value: t.value };
    }
    if (t.type === "op" && (t.value === "TRUE" || t.value === "FALSE")) {
      this.next();
      return { kind: "bool", value: t.value === "TRUE" };
    }
    if (t.type === "ident") {
      this.next();
      return { kind: "var", name: t.value };
    }
    if (t.type === "lparen") {
      this.next();
      const items: Node[] = [this.parseOr()];
      while (this.peek().type === "comma") {
        this.next();
        items.push(this.parseOr());
      }
      this.expect("rparen");
      // A single parenthesised expression is just grouping; a comma makes a list.
      return items.length === 1 ? items[0] : { kind: "list", items };
    }

    throw new ExprError(`Unexpected token '${t.value}' at ${t.pos}`);
  }
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

function isMissing(v: ExprValue): boolean {
  return v === undefined || v === null || v === "";
}

function toNumber(v: ExprValue): number | undefined {
  if (typeof v === "number") return Number.isNaN(v) ? undefined : v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return undefined;
}

/** Loose scalar equality: numeric when both sides look numeric, else string. */
function looseEq(a: ExprValue, b: ExprValue): boolean {
  const na = toNumber(a);
  const nb = toNumber(b);
  if (na !== undefined && nb !== undefined) return na === nb;
  return String(a) === String(b);
}

type RawValue = ExprValue | Array<number | string>;

function evalNode(node: Node, ctx: EvalContext): RawValue {
  switch (node.kind) {
    case "num":
      return node.value;
    case "str":
      return node.value;
    case "bool":
      return node.value;
    case "var":
      return ctx[node.name];
    case "list":
      return node.items.map((it) => evalNode(it, ctx) as number | string);
    case "unary": {
      if (node.op === "NOT") return !truthy(evalNode(node.operand, ctx));
      // unary minus
      const v = toNumber(evalNode(node.operand, ctx) as ExprValue);
      return v === undefined ? undefined : -v;
    }
    case "binary":
      return evalBinary(node, ctx);
  }
}

function evalBinary(node: Node & { kind: "binary" }, ctx: EvalContext): RawValue {
  const { op } = node;

  if (op === "AND") return truthy(evalNode(node.left, ctx)) && truthy(evalNode(node.right, ctx));
  if (op === "OR") return truthy(evalNode(node.left, ctx)) || truthy(evalNode(node.right, ctx));

  const left = evalNode(node.left, ctx) as ExprValue;
  const right = evalNode(node.right, ctx) as ExprValue;

  switch (op) {
    case "=":
      return looseEq(left, right);
    case "!=":
    case "≠":
      return !looseEq(left, right);
    case "IN": {
      // right is a set/array (list literal or an array-valued variable).
      const set = Array.isArray(right) ? right : isMissing(right) ? [] : [right];
      return set.some((item) => looseEq(left, item as ExprValue));
    }
    case "<":
    case "<=":
    case ">":
    case ">=": {
      const a = toNumber(left);
      const b = toNumber(right);
      if (a === undefined || b === undefined) return false;
      if (op === "<") return a < b;
      if (op === "<=") return a <= b;
      if (op === ">") return a > b;
      return a >= b;
    }
    case "+":
    case "-":
    case "*":
    case "/": {
      const a = toNumber(left) ?? 0;
      const b = toNumber(right) ?? 0;
      if (op === "+") return a + b;
      if (op === "-") return a - b;
      if (op === "*") return a * b;
      return b === 0 ? 0 : a / b;
    }
    default:
      throw new ExprError(`Unknown operator '${op}'`);
  }
}

function truthy(v: RawValue): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (Array.isArray(v)) return v.length > 0;
  return !isMissing(v as ExprValue);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const astCache = new Map<string, Node>();

function compile(expr: string): Node {
  let ast = astCache.get(expr);
  if (!ast) {
    ast = new Parser(tokenize(expr)).parse();
    astCache.set(expr, ast);
  }
  return ast;
}

/** Parse `expr` (throws `ExprError` on a syntax error). Used by schema validation. */
export function parse(expr: string): Node {
  return compile(expr);
}

/** Evaluate `expr` against `ctx`, returning the raw value (boolean / number / string / array). */
export function evaluate(expr: string, ctx: EvalContext): RawValue {
  return evalNode(compile(expr), ctx);
}

/** Evaluate `expr` as a boolean. */
export function evaluateBool(expr: string, ctx: EvalContext): boolean {
  return truthy(evaluate(expr, ctx));
}

/**
 * Relevance (skip logic). An empty expression or the literal `always` means the
 * field/module is always shown. Anything else is evaluated against `ctx`.
 */
export function isRelevant(relevance: string | null | undefined, ctx: EvalContext): boolean {
  if (!relevance || relevance.trim() === "" || relevance.trim().toLowerCase() === "always") {
    return true;
  }
  return evaluateBool(relevance, ctx);
}

/**
 * Constraint check. An empty constraint always passes. A non-empty constraint
 * passes when it evaluates truthy (the convention: the constraint states what
 * must hold, e.g. `qC_03 <= qC_02`).
 */
export function satisfiesConstraint(
  constraint: string | null | undefined,
  ctx: EvalContext,
): boolean {
  if (!constraint || constraint.trim() === "") return true;
  return evaluateBool(constraint, ctx);
}
