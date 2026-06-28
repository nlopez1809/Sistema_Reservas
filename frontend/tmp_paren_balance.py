from pathlib import Path
lines = Path(r'd:\Paginas web terminadas\Sistema Reserva Restaurantes\frontend\src\pages\AdminPage.tsx').read_text(encoding='utf8').splitlines()
expr_lines = lines[274:286]
paren = 0
for i, line in enumerate(expr_lines, start=275):
    for ch in line:
        if ch == '(':
            paren += 1
        elif ch == ')':
            paren -= 1
    print(i, paren, line)
