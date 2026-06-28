from pathlib import Path
import re

src_path = Path('src/pages/AdminPage.tsx')
text = src_path.read_text(encoding='utf8')
pattern = re.compile(r'<input ref=\{fileRef\}[\s\S]*?\}/>')
repl = '<input ref={fileRef} type="file" accept=".csv,.txt" style={{ display:\'none\' }} onChange={()=>{}}/>'
new_text = re.sub(pattern, repl, text, count=1)
Path('tmp_test.tsx').write_text(new_text, encoding='utf8')
print('temp file written')
