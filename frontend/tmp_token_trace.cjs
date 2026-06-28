const ts = require('typescript');
const fs = require('fs');
const src = fs.readFileSync('./src/pages/AdminPage.tsx', 'utf8');
const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.TSX, src);
let token = scanner.scan();
while (token !== ts.SyntaxKind.EndOfFileToken) {
  const pos = scanner.getTokenPos();
  const line = src.slice(0, pos).split('\n').length;
  if (line >= 860) {
    const text = scanner.getTokenText();
    console.log(`${line}:${pos} ${ts.tokenToString(token)} [${text.replace(/\n/g,'\\n')}]`);
  }
  token = scanner.scan();
}
