from pathlib import Path
text = Path('src/pages/AdminPage.tsx').read_text(encoding='utf8')
start = text.index('    return (') if '    return (' in text else 0
line = 1
paren = brace = brack = 0
state = 'code'
escape = False
quote = ''
for i, ch in enumerate(text[start:], start=start):
    if ch == '\n':
        line += 1
        if state == 'line_comment':
            state = 'code'
        continue
    if state == 'code':
        if ch == '/':
            nxt = text[i+1] if i+1 < len(text) else ''
            if nxt == '/':
                state = 'line_comment'
                continue
            if nxt == '*':
                state = 'block_comment'
                continue
        if ch in ('"', "'", '`'):
            state = 'string'
            quote = ch
            continue
        if ch == '{':
            brace += 1
        elif ch == '}':
            brace -= 1
        elif ch == '(': 
            paren += 1
        elif ch == ')':
            paren -= 1
        elif ch == '[':
            brack += 1
        elif ch == ']':
            brack -= 1
    elif state == 'string':
        if escape:
            escape = False
        elif ch == '\\':
            escape = True
        elif ch == quote:
            state = 'code'
    elif state == 'block_comment':
        if ch == '*' and i+1 < len(text) and text[i+1] == '/':
            state = 'code'
    if line % 20 == 0 and ch == '\n':
        print(f'{line} paren={paren} brace={brace} brack={brack}')
    if line >= 880 and ch == '\n':
        print(f'{line} paren={paren} brace={brace} brack={brack}')
print('final', paren, brace, brack, 'state', state)
