from pathlib import Path
lines = Path('src/pages/AdminPage.tsx').read_text(encoding='utf8').splitlines()
for i in range(880, 893):
    line = lines[i-1]
    print(f"{i}: {line} | parens {line.count('(')}-{line.count(')')}, braces {line.count('{')}-{line.count('}')}, brackets {line.count('[')}-{line.count(']')}")
