from pathlib import Path
lines = Path('src/pages/AdminPage.tsx').read_text(encoding='utf8').splitlines()
start = 192
brace = 0
for i, line in enumerate(lines[start:], start=start+1):
    brace += line.count('{') - line.count('}')
    if i >= len(lines) - 80:
        print(i, brace, line)
print('final brace', brace)
