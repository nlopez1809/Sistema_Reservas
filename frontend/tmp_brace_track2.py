from pathlib import Path
lines = Path('src/pages/AdminPage.tsx').read_text(encoding='utf8').splitlines()
start = 193
brace = 0
for i, line in enumerate(lines[start-1:], start=start):
    brace += line.count('{') - line.count('}')
    if i % 20 == 0 or abs(brace) > 10 or i > len(lines)-20:
        print(i, brace, line)
print('final brace', brace)
