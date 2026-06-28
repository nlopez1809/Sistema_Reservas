const fs = require('fs');
const ts = require('typescript');
const path = 'src/pages/AdminPage.tsx';
const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);
const snippet = lines.slice(270-1, 286).join('\n');
const testSource = `const React = { createElement: () => null };
const clientes=[];
const td={};
const rowBg = ()=>({});
const fmtCur = ()=>'';
const x = () => (
${snippet}
);
`;
const sf = ts.createSourceFile('snippet.tsx', testSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const diagnostics = sf.parseDiagnostics;
if (diagnostics.length === 0) {
  console.log('OK');
} else {
  diagnostics.forEach(d=>{
    const pos = d.start!==undefined?sf.getLineAndCharacterOfPosition(d.start):{line:0,char:0};
    console.log(`${pos.line+1}:${pos.character+1} ${ts.flattenDiagnosticMessageText(d.messageText,'\n')}`);
  });
}
