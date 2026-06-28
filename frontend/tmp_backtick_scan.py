from pathlib import Path
text = Path('src/pages/AdminPage.tsx').read_text(encoding='utf-8')
lines = text.splitlines()
for i in range(760, 860):
    if i-1 < len(lines):
        line = lines[i-1]
        ticks = [j for j, c in enumerate(line) if c == '`']
        if ticks:
            print(f'{i}: {line}')
            print('  ticks at', ticks)
