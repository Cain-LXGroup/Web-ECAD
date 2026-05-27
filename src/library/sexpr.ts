export type SExpr = string | SExpr[];

export const tokenizeSExpr = (content: string): string[] => {
  console.info("[sexpr] Tokenizing S-expression content");

  const tokens: string[] = [];
  let index = 0;

  while (index < content.length) {
    const char = content[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (char === ";") {
      while (index < content.length && content[index] !== "\n") {
        index += 1;
      }
      continue;
    }

    if (char === "(" || char === ")") {
      tokens.push(char);
      index += 1;
      continue;
    }

    if (char === '"') {
      let value = "";
      index += 1;

      while (index < content.length) {
        const current = content[index];

        if (current === "\\" && index + 1 < content.length) {
          value += content[index + 1];
          index += 2;
          continue;
        }

        if (current === '"') {
          index += 1;
          break;
        }

        value += current;
        index += 1;
      }

      tokens.push(`"${value}"`);
      continue;
    }

    let atom = "";

    while (index < content.length && !/\s|[()]/.test(content[index] ?? "")) {
      atom += content[index];
      index += 1;
    }

    if (atom.length > 0) {
      tokens.push(atom);
    }
  }

  return tokens;
};

export const parseSExpr = (content: string): SExpr => {
  console.info("[sexpr] Parsing S-expression content");

  const tokens = tokenizeSExpr(content);
  let index = 0;

  const readExpr = (): SExpr => {
    const token = tokens[index];

    if (!token) {
      return "";
    }

    if (token === "(") {
      index += 1;
      const list: SExpr[] = [];

      while (index < tokens.length && tokens[index] !== ")") {
        list.push(readExpr());
      }

      if (tokens[index] === ")") {
        index += 1;
      }

      return list;
    }

    index += 1;

    if (token.startsWith('"') && token.endsWith('"')) {
      return token.slice(1, -1);
    }

    return token;
  };

  return readExpr();
};

export const isSExprList = (expr: SExpr): expr is SExpr[] => Array.isArray(expr);

export const sExprHead = (expr: SExpr): string => {
  if (!isSExprList(expr) || expr.length === 0) {
    return "";
  }

  const first = expr[0];
  return typeof first === "string" ? first : "";
};

export const sExprAtom = (expr: SExpr, itemIndex: number): string => {
  if (!isSExprList(expr)) {
    return "";
  }

  const value = expr[itemIndex];
  return typeof value === "string" ? value : "";
};

export const findChildLists = (expr: SExpr, childHead: string): SExpr[] => {
  if (!isSExprList(expr)) {
    return [];
  }

  return expr
    .slice(1)
    .filter((child): child is SExpr[] => isSExprList(child) && sExprHead(child) === childHead);
};

export default parseSExpr;
