const fs = require('fs');
const ts = require('typescript');
const source = fs.readFileSync('src/pages/AdminPage.tsx', 'utf8');
const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.JSX, source, undefined, ts.ScriptKind.TSX);
let token = scanner.scan();
let paren = 0;
let brace = 0;
let bracket = 0;
let currentLine = 1;
let lineParen = 0;
let lineBrace = 0;
let lineBracket = 0;
while (token !== ts.SyntaxKind.EndOfFileToken) {
  const start = scanner.getTokenPos();
  const loc = source.slice(0, start).split('\n');
  const lineNum = loc.length;
  const charNum = loc[loc.length-1].length + 1;
  if (token === ts.SyntaxKind.OpenParenToken) paren++, lineParen++;
  else if (token === ts.SyntaxKind.CloseParenToken) paren--, lineParen--;
  else if (token === ts.SyntaxKind.OpenBraceToken) brace++, lineBrace++;
  else if (token === ts.SyntaxKind.CloseBraceToken) brace--, lineBrace--;
  else if (token === ts.SyntaxKind.OpenBracketToken) bracket++, lineBracket++;
  else if (token === ts.SyntaxKind.CloseBracketToken) bracket--, lineBracket--;
  if (lineNum >= 820 && lineNum <= 906) {
    if (lineNum !== currentLine) {
      currentLine = lineNum;
      lineParen = 0;
      lineBrace = 0;
      lineBracket = 0;
    }
    console.log(`${lineNum}:${charNum} ${ts.tokenToString(token)} '${scanner.getTokenText()}' paren=${paren} brace=${brace} bracket=${bracket}`);
  }
  if (paren < 0 || brace < 0 || bracket < 0) {
    console.log(`negative at ${lineNum}:${charNum} token=${ts.tokenToString(token)} paren=${paren} brace=${brace} bracket=${bracket}`);
    break;
  }
  token = scanner.scan();
}
console.log('final paren', paren, 'brace', brace, 'bracket', bracket);
console.log('final paren', paren, 'brace', brace, 'bracket', bracket);
