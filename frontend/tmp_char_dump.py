from pathlib import Path
text = Path('src/pages/AdminPage.tsx').read_text(encoding='utf-8')
lines = text.splitlines()
for ln in range(850, 857):
    line = lines[ln-1]
    print(f'{ln}: {line}')
    for i, ch in enumerate(line):
        if ch in {'`', '"', '\'', '{', '}', '(', ')', '$'}:
            print(f'  {i}: {ord(ch)} {repr(ch)}')
    print()