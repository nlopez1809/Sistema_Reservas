from pathlib import Path
text = Path('src/pages/AdminPage.tsx').read_text(encoding='utf8')
start = 192
lines = text.splitlines()[start:]
paren = 0
brace = 0
brack = 0
for i, line in enumerate(lines, start=start+1):
    paren += line.count('(') - line.count(')')
    brace += line.count('{') - line.count('}')
    brack += line.count('[') - line.count(']')
    if i % 50 == 0:
        print(i, paren, brace, brack)
print('end', paren, brace, brack)
