const ts = require('typescript');
const fs = require('fs');
const src = fs.readFileSync('./src/pages/AdminPage.tsx','utf8');
const scanner = ts.createScanner(ts.ScriptTarget.Latest,false,ts.LanguageVariant.TSX,src);
let t = scanner.scan();
let brace=0, paren=0, bracket=0;
const lineCount = src.split('\n').length;
const lineBrace = Array(lineCount+2).fill(0);
while(t!==ts.SyntaxKind.EndOfFileToken){
  const pos = scanner.getTokenPos();
  const line = src.slice(0,pos).split('\n').length;
  if(t===ts.SyntaxKind.OpenBraceToken) brace++;
  else if(t===ts.SyntaxKind.CloseBraceToken) brace--;
  else if(t===ts.SyntaxKind.OpenParenToken) paren++;
  else if(t===ts.SyntaxKind.CloseParenToken) paren--;
  else if(t===ts.SyntaxKind.OpenBracketToken) bracket++;
  else if(t===ts.SyntaxKind.CloseBracketToken) bracket--;
  lineBrace[line]=brace;
  t=scanner.scan();
}
for(let i=1;i<=lineCount;i++){
  if(lineBrace[i]!==0) console.log(`${i}: ${lineBrace[i]}`);
}
console.log('FINAL', brace, paren, bracket);
