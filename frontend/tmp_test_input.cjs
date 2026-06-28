const ts = require('typescript');
const text = `const fileRef:any = null;
const dias:any[] = [];
const createPlato = async (p:any) => {};
const loadAll = () => {};
const input = <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display:'none' }} onChange={async e=>{
  const f=e.target.files?.[0]; if(!f) return
  const text=await f.text()
  const lines=text.trim().split('\n').map(l=>l.split(',').map(c=>c.trim().replace(/"/g,'')))
  const h=lines[0].map(x=>x.toLowerCase()); const gi=(k:string)=>h.indexOf(k)
  for(let i=1;i<lines.length;i++){
    const r=lines[i]; const diaNombre=r[gi('dia')]; const cat=r[gi('categoria')]
    const dia=dias.find(d=>d.nombre===diaNombre); if(!dia) continue
    await createPlato({dia_id:dia.id,categoria:cat,nombre:r[gi('nombre')],descripcion:r[gi('descripcion')]||'',precio:parseFloat(r[gi('precio')]),emoji:r[gi('emoji')]||'🍽️',stock:parseInt(r[gi('stock')]),stock_inicial:parseInt(r[gi('stock')])} as any)
  }
  alert('Importación completada'); loadAll()
}} />;
`;
const sf = ts.createSourceFile('test.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
console.log('diagnostics', sf.parseDiagnostics.length);
sf.parseDiagnostics.forEach(d => {
  const pos = d.start;
  const loc = text.slice(0, pos).split('\n');
  console.log(`${loc.length}:${loc[loc.length-1].length+1} ${d.messageText}`);
});
