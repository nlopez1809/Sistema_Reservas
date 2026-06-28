const ts = require('typescript');
const fs = require('fs');
const source = fs.readFileSync('./src/pages/AdminPage.tsx', 'utf8');
const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.TSX, source);
const stack = [];
let token = scanner.scan();
while (token !== ts.SyntaxKind.EndOfFileToken) {
  const pos = scanner.getTokenPos();
  const line = source.slice(0, pos).split('\n').length;
  const ch = source.slice(0, pos).split('\n').pop().length + 1;
  if (token === ts.SyntaxKind.OpenBraceToken) {
    stack.push({ line, ch, text: '{' });
  } else if (token === ts.SyntaxKind.CloseBraceToken) {
    if (stack.length > 0) stack.pop();
    else stack.push({ line, ch, text: '}' });
  }
  token = scanner.scan();
}
console.log('UNMATCHED STACK LENGTH', stack.length);
stack.forEach((item, idx) => console.log(`${idx}: ${item.line}:${item.ch} ${item.text}`));
