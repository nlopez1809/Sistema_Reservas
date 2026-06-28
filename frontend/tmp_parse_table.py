from pathlib import Path
source = '''const ts = require('typescript');
const src = `const clientes=[];
const td={};
const rowBg=()=>({});
const x = (
  <table>
    <tbody>{[...clientes].sort((a,b)=>(b.total_pedidos||0)-(a.total_pedidos||0)).map((c,i)=>(<tr key={c.id} style={rowBg(i)}><td style={td}><a href={`https://wa.me/591${c.whatsapp}`} target="_blank" rel="noreferrer" style={{ color:'#22c55e',fontWeight:700,textDecoration:'none' }}>📱 {c.whatsapp}</a></td><td style={{ ...td,fontWeight:800 }}>{c.nombre}</td></tr>))}</tbody>
  </table>
);
`;
const sf = ts.createSourceFile('snippet.tsx', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
console.log(ts.formatDiagnosticsWithColorAndContext(sf.parseDiagnostics, {getCurrentDirectory:()=>'', getCanonicalFileName:f=>f, getNewLine:()=>"\n"}));
`;
const fs = require('fs');
fs.writeFileSync('tmp_parse_table.js', src);
'''
Path('tmp_parse_table.js').write_text(source, encoding='utf8')
