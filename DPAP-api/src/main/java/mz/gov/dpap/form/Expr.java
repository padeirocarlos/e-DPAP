package mz.gov.dpap.form;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Server-side relevance / constraint expression engine (BRD FR-FORM-4, NFR-9).
 * A line-for-line port of the TypeScript {@code schema/src/expr.ts} used by the
 * web and mobile clients, so the client and server agree on skip logic and
 * constraints. No scripting / reflection — only the operators the BRD uses.
 *
 * Grammar (precedence low → high): OR, AND, NOT, comparison
 * ({@code = != ≠ < <= > >= IN}), additive ({@code + -}), multiplicative
 * ({@code * /}), unary minus, primary (number, string, bool, var, {@code (list)}).
 * {@code IN} is membership: {@code x IN (1,2,4)} or {@code 1 IN qA_15} (array var).
 */
public final class Expr {

    private Expr() {
    }

    public static class ExprException extends RuntimeException {
        public ExprException(String message) {
            super(message);
        }
    }

    // --- Tokenizer ----------------------------------------------------------

    private enum TokType { NUM, STR, IDENT, OP, LPAREN, RPAREN, COMMA, EOF }

    private record Token(TokType type, String value, int pos) {
    }

    private static final Set<String> KEYWORDS = Set.of("AND", "OR", "NOT", "IN", "TRUE", "FALSE");
    // Multi-char operators first.
    private static final String[] OPERATORS = {"<=", ">=", "!=", "≠", "=", "<", ">", "+", "-", "*", "/"};

    private static List<Token> tokenize(String input) {
        List<Token> tokens = new ArrayList<>();
        int i = 0;
        int n = input.length();
        while (i < n) {
            char c = input.charAt(i);
            if (c == ' ' || c == '\t' || c == '\n' || c == '\r') {
                i++;
                continue;
            }
            if (c == '(') {
                tokens.add(new Token(TokType.LPAREN, "(", i++));
                continue;
            }
            if (c == ')') {
                tokens.add(new Token(TokType.RPAREN, ")", i++));
                continue;
            }
            if (c == ',') {
                tokens.add(new Token(TokType.COMMA, ",", i++));
                continue;
            }
            if (c == '"' || c == '\'') {
                char quote = c;
                int j = i + 1;
                StringBuilder sb = new StringBuilder();
                while (j < n && input.charAt(j) != quote) {
                    if (input.charAt(j) == '\\' && j + 1 < n) {
                        sb.append(input.charAt(j + 1));
                        j += 2;
                    } else {
                        sb.append(input.charAt(j));
                        j++;
                    }
                }
                if (j >= n) {
                    throw new ExprException("Unterminated string at " + i);
                }
                tokens.add(new Token(TokType.STR, sb.toString(), i));
                i = j + 1;
                continue;
            }
            if (c >= '0' && c <= '9') {
                int j = i;
                while (j < n && ((input.charAt(j) >= '0' && input.charAt(j) <= '9') || input.charAt(j) == '.')) {
                    j++;
                }
                tokens.add(new Token(TokType.NUM, input.substring(i, j), i));
                i = j;
                continue;
            }
            boolean matchedOp = false;
            for (String op : OPERATORS) {
                if (input.startsWith(op, i)) {
                    tokens.add(new Token(TokType.OP, op, i));
                    i += op.length();
                    matchedOp = true;
                    break;
                }
            }
            if (matchedOp) {
                continue;
            }
            if (Character.isLetter(c) || c == '_') {
                int j = i;
                while (j < n && (Character.isLetterOrDigit(input.charAt(j)) || input.charAt(j) == '_')) {
                    j++;
                }
                String raw = input.substring(i, j);
                String upper = raw.toUpperCase();
                if (KEYWORDS.contains(upper)) {
                    tokens.add(new Token(TokType.OP, upper, i));
                } else {
                    tokens.add(new Token(TokType.IDENT, raw, i));
                }
                i = j;
                continue;
            }
            throw new ExprException("Unexpected character '" + c + "' at " + i);
        }
        tokens.add(new Token(TokType.EOF, "", n));
        return tokens;
    }

    // --- AST ----------------------------------------------------------------

    private sealed interface Node permits Num, Str, Bool, Var, ListNode, Unary, Binary {
    }

    private record Num(double value) implements Node {
    }

    private record Str(String value) implements Node {
    }

    private record Bool(boolean value) implements Node {
    }

    private record Var(String name) implements Node {
    }

    private record ListNode(List<Node> items) implements Node {
    }

    private record Unary(String op, Node operand) implements Node {
    }

    private record Binary(String op, Node left, Node right) implements Node {
    }

    // --- Parser -------------------------------------------------------------

    private static final class Parser {
        private final List<Token> tokens;
        private int pos = 0;

        Parser(List<Token> tokens) {
            this.tokens = tokens;
        }

        Node parse() {
            Node node = parseOr();
            expect(TokType.EOF);
            return node;
        }

        private Token peek() {
            return tokens.get(pos);
        }

        private Token next() {
            return tokens.get(pos++);
        }

        private boolean isOp(String value) {
            Token t = peek();
            return t.type() == TokType.OP && t.value().equals(value);
        }

        private Token expect(TokType type) {
            Token t = peek();
            if (t.type() != type) {
                throw new ExprException("Expected " + type + " but found '" + t.value() + "' at " + t.pos());
            }
            return next();
        }

        private Node parseOr() {
            Node left = parseAnd();
            while (isOp("OR")) {
                next();
                left = new Binary("OR", left, parseAnd());
            }
            return left;
        }

        private Node parseAnd() {
            Node left = parseNot();
            while (isOp("AND")) {
                next();
                left = new Binary("AND", left, parseNot());
            }
            return left;
        }

        private Node parseNot() {
            if (isOp("NOT")) {
                next();
                return new Unary("NOT", parseNot());
            }
            return parseComparison();
        }

        private Node parseComparison() {
            Node left = parseAdditive();
            Token t = peek();
            if (t.type() == TokType.OP
                    && Set.of("=", "!=", "≠", "<", "<=", ">", ">=", "IN").contains(t.value())) {
                next();
                return new Binary(t.value(), left, parseAdditive());
            }
            return left;
        }

        private Node parseAdditive() {
            Node left = parseMultiplicative();
            while (isOp("+") || isOp("-")) {
                String op = next().value();
                left = new Binary(op, left, parseMultiplicative());
            }
            return left;
        }

        private Node parseMultiplicative() {
            Node left = parseUnary();
            while (isOp("*") || isOp("/")) {
                String op = next().value();
                left = new Binary(op, left, parseUnary());
            }
            return left;
        }

        private Node parseUnary() {
            if (isOp("-")) {
                next();
                return new Unary("-", parseUnary());
            }
            return parsePrimary();
        }

        private Node parsePrimary() {
            Token t = peek();
            switch (t.type()) {
                case NUM -> {
                    next();
                    return new Num(Double.parseDouble(t.value()));
                }
                case STR -> {
                    next();
                    return new Str(t.value());
                }
                case IDENT -> {
                    next();
                    return new Var(t.value());
                }
                case OP -> {
                    if (t.value().equals("TRUE") || t.value().equals("FALSE")) {
                        next();
                        return new Bool(t.value().equals("TRUE"));
                    }
                    throw new ExprException("Unexpected token '" + t.value() + "' at " + t.pos());
                }
                case LPAREN -> {
                    next();
                    List<Node> items = new ArrayList<>();
                    items.add(parseOr());
                    while (peek().type() == TokType.COMMA) {
                        next();
                        items.add(parseOr());
                    }
                    expect(TokType.RPAREN);
                    return items.size() == 1 ? items.get(0) : new ListNode(items);
                }
                default -> throw new ExprException("Unexpected token '" + t.value() + "' at " + t.pos());
            }
        }
    }

    // --- Evaluation ---------------------------------------------------------

    private static boolean isMissing(Object v) {
        return v == null || "".equals(v);
    }

    private static Double toNumber(Object v) {
        if (v instanceof Boolean b) {
            return b ? 1.0 : 0.0;
        }
        if (v instanceof Number num) {
            double d = num.doubleValue();
            return Double.isNaN(d) ? null : d;
        }
        if (v instanceof String s && !s.isBlank()) {
            try {
                return Double.parseDouble(s.trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private static boolean looseEq(Object a, Object b) {
        Double na = toNumber(a);
        Double nb = toNumber(b);
        if (na != null && nb != null) {
            return na.doubleValue() == nb.doubleValue();
        }
        return String.valueOf(a).equals(String.valueOf(b));
    }

    private static boolean truthy(Object v) {
        if (v instanceof Boolean b) {
            return b;
        }
        if (v instanceof Number num) {
            return num.doubleValue() != 0;
        }
        if (v instanceof Collection<?> c) {
            return !c.isEmpty();
        }
        return !isMissing(v);
    }

    private static Object eval(Node node, Map<String, Object> ctx) {
        if (node instanceof Num n) {
            return n.value();
        }
        if (node instanceof Str s) {
            return s.value();
        }
        if (node instanceof Bool b) {
            return b.value();
        }
        if (node instanceof Var v) {
            return ctx.get(v.name());
        }
        if (node instanceof ListNode l) {
            List<Object> out = new ArrayList<>();
            for (Node it : l.items()) {
                out.add(eval(it, ctx));
            }
            return out;
        }
        if (node instanceof Unary u) {
            if (u.op().equals("NOT")) {
                return !truthy(eval(u.operand(), ctx));
            }
            Double v = toNumber(eval(u.operand(), ctx));
            return v == null ? null : -v;
        }
        if (node instanceof Binary bin) {
            return evalBinary(bin, ctx);
        }
        throw new ExprException("Unknown node");
    }

    private static Object evalBinary(Binary node, Map<String, Object> ctx) {
        String op = node.op();
        if (op.equals("AND")) {
            return truthy(eval(node.left(), ctx)) && truthy(eval(node.right(), ctx));
        }
        if (op.equals("OR")) {
            return truthy(eval(node.left(), ctx)) || truthy(eval(node.right(), ctx));
        }
        Object left = eval(node.left(), ctx);
        Object right = eval(node.right(), ctx);
        switch (op) {
            case "=" -> {
                return looseEq(left, right);
            }
            case "!=", "≠" -> {
                return !looseEq(left, right);
            }
            case "IN" -> {
                Collection<?> set;
                if (right instanceof Collection<?> c) {
                    set = c;
                } else if (isMissing(right)) {
                    set = List.of();
                } else {
                    set = List.of(right);
                }
                for (Object item : set) {
                    if (looseEq(left, item)) {
                        return true;
                    }
                }
                return false;
            }
            case "<", "<=", ">", ">=" -> {
                Double a = toNumber(left);
                Double b = toNumber(right);
                if (a == null || b == null) {
                    return false;
                }
                return switch (op) {
                    case "<" -> a < b;
                    case "<=" -> a <= b;
                    case ">" -> a > b;
                    default -> a >= b;
                };
            }
            case "+", "-", "*", "/" -> {
                double a = toNumber(left) == null ? 0 : toNumber(left);
                double b = toNumber(right) == null ? 0 : toNumber(right);
                return switch (op) {
                    case "+" -> a + b;
                    case "-" -> a - b;
                    case "*" -> a * b;
                    default -> b == 0 ? 0 : a / b;
                };
            }
            default -> throw new ExprException("Unknown operator '" + op + "'");
        }
    }

    // --- Public API ---------------------------------------------------------

    /** Parse {@code expr}, throwing {@link ExprException} on a syntax error. */
    public static void parse(String expr) {
        new Parser(tokenize(expr)).parse();
    }

    public static Object evaluate(String expr, Map<String, Object> ctx) {
        return eval(new Parser(tokenize(expr)).parse(), ctx);
    }

    public static boolean evaluateBool(String expr, Map<String, Object> ctx) {
        return truthy(evaluate(expr, ctx));
    }

    /** Relevance: empty or {@code always} → true; otherwise evaluate. */
    public static boolean isRelevant(String relevance, Map<String, Object> ctx) {
        if (relevance == null || relevance.isBlank() || relevance.trim().equalsIgnoreCase("always")) {
            return true;
        }
        return evaluateBool(relevance, ctx);
    }

    /** Constraint: empty → passes; otherwise the expression must be truthy. */
    public static boolean satisfiesConstraint(String constraint, Map<String, Object> ctx) {
        if (constraint == null || constraint.isBlank()) {
            return true;
        }
        return evaluateBool(constraint, ctx);
    }
}
