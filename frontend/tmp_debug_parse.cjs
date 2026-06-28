const fs = require('fs');
const ts = require('typescript');
const path = 'src/pages/AdminPage.tsx';
const source = fs.readFileSync(path, 'utf8');
const start = source.indexOf('        {/* ── AJUSTES ── */}');
const end = source.lastIndexOf('    </div>{/* end root */}');
if (start === -1 || end === -1) {
  console.error('Could not find ajustes/end markers');
  process.exit(1);
}
const modified = source.slice(0, start) + source.slice(end);
fs.writeFileSync('tmp_parse_removed_new_plato.tsx', modified, 'utf8');
const sf = ts.createSourceFile('tmp_parse_removed_new_plato.tsx', modified, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const diagnostics = sf.parseDiagnostics;
for (const d of diagnostics) {
  const { line, character } = sf.getLineAndCharacterOfPosition(d.start || 0);
  console.log(`${line + 1}:${character + 1} ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`);
}
console.log('done');
