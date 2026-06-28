from pathlib import Path
lines = Path('src/pages/AdminPage.tsx').read_text(encoding='utf8').splitlines()
for i in range(270, 286):
    line = lines[i-1]
    print(i, line)
    print('  (', line.count('('), ')', line.count(')'), '{', line.count('{'), '}', line.count('}'))
