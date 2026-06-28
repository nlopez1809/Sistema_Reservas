const ts = require('typescript');
const fs = require('fs');
const source = fs.readFileSync('./src/pages/AdminPage.tsx', 'utf8');
const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.TSX, source);
let token = scanner.scan();
let paren = 0, brace = 0, bracket = 0;
while (token !== ts.SyntaxKind.EndOfFileToken) {
  const pos = scanner.getTokenPos();
  const loc = source.slice(0, pos).split('\n');
  const line = loc.length;
  const ch = loc[loc.length - 1].length + 1;
  if (token === ts.SyntaxKind.OpenBraceToken) brace++;
  else if (token === ts.SyntaxKind.CloseBraceToken) brace--;
  else if (token === ts.SyntaxKind.OpenParenToken) paren++;
  else if (token === ts.SyntaxKind.CloseParenToken) paren--;
  else if (token === ts.SyntaxKind.OpenBracketToken) bracket++;
  else if (token === ts.SyntaxKind.CloseBracketToken) bracket--;
  if (line >= 780 && line <= 910 &&
      (token === ts.SyntaxKind.OpenBraceToken || token === ts.SyntaxKind.CloseBraceToken || token === ts.SyntaxKind.OpenParenToken || token === ts.SyntaxKind.CloseParenToken)) {
    console.log(`${line}:${ch} ${ts.tokenToString(token)} brace=${brace} paren=${paren} bracket=${bracket}`);
  }
  token = scanner.scan();
}
console.log('FINAL brace', brace, 'paren', paren, 'bracket', bracket);
const sf = ts.createSourceFile('AdminPage.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
console.log('parseDiagnostics', sf.parseDiagnostics.length);
sf.parseDiagnostics.forEach(d => {
  const { line, character } = sf.getLineAndCharacterOfPosition(d.start);
  console.log(`${line+1}:${character+1} ${d.messageText}`);
});
