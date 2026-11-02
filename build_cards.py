import openpyxl, re, json, sys
src = sys.argv[1]
ELS = ['Agni', 'Tamas', 'Nira', 'Vayu', 'Dharti', 'Jyoti']
ws = openpyxl.load_workbook(src, data_only=True).active
out, bad = [], []
for r in ws.iter_rows(min_row=2, values_only=True):
    if not r[0]:
        continue
    m = re.match(r'PRL-(\d+) \[(\w+)\]', r[0])
    n, rar = int(m.group(1)), m.group(2)
    t = (r[3] or '')
    c = {'id': 'PRL-%03d' % n, 'rar': rar, 'th': (r[1] or '').strip(), 'en': (r[2] or '').strip(),
         'el': ELS[(n - 1) // 100], 'text': (r[5] or '').strip(), 'art': (r[7] or '')}
    tm = re.search(r'\(([^)]*)\)', t)
    c['tribe'] = (tm.group(1).split('/')[-1].strip() if tm else '')
    cost = r[4]
    if t.startswith('Sovereign'):
        c['type'] = 'sovereign'
        a = re.findall(r'(\d+) Gem', str(cost))
        c['asc'] = [int(x) for x in a]
        c['hp'] = [int(x) for x in re.findall(r'\d+', r[6])]
    elif t.startswith('Spirit'):
        c['type'] = 'spirit'
        c['tier'] = t.count('★')
        s = str(cost)
        mm = re.match(r'(\d+)(?: \(RE: (\d+)\))?', s)
        c['cost'] = int(mm.group(1)) if mm else 0
        c['re'] = int(mm.group(2) or 0) if mm else 0
        st = re.search(r'ATK (\d+) / DEF (\d+)', r[6] or '')
        if not st:
            bad.append(c['id'])
            continue
        c['atk'], c['def'] = int(st.group(1)), int(st.group(2))
    elif t.startswith('Mantra'):
        c['type'] = 'mantra'
        c['cost'] = int(float(cost))
    elif t.startswith('Sanctuary'):
        c['type'] = 'sanct'
        c['cost'] = int(float(cost))
    elif t.startswith('Seal'):
        c['type'] = 'seal'
        a = re.search(r'(\d+) Gem', str(cost))
        c['act'] = int(a.group(1)) if a else 0
    else:
        bad.append(c['id'])
        continue
    c['burst'] = '[Karma Burst]' in c['text']
    out.append(c)
open('cards.js', 'w', encoding='utf-8').write('const CARDS=' + json.dumps(out, ensure_ascii=False) + ';')
print(len(out), 'cards; bad:', bad)
