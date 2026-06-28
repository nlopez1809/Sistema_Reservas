from pathlib import Path
lines = Path('src/pages/AdminPage.tsx').read_text(encoding='utf8').splitlines()
start = 760
paren = brace = brack = 0
for i, line in enumerate(lines[start-1:], start=start):
    paren += line.count('(') - line.count(')')
    brace += line.count('{') - line.count('}')
    brack += line.count('[') - line.count(']')
    print(f"{i}: paren={paren} brace={brace} brack={brack} | {line}")
