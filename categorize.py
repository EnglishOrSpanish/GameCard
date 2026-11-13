"""Tag each ability with a trigger category so players can tell at a glance when it works.

Usage: python categorize.py <sheet.csv>
  - reads the card sheet (exported as CSV from Google Sheets)
  - writes abilities-categorized.csv (new ability text to paste back into the sheet)
  - rewrites the ability text inside cards.js so the game shows the categories

Each unique ability name in [ ] is replaced by a category in 【 】 picked from the sentence after it.
Rule keywords (Karma Burst, โจมตีก่อน, ข้ามธาตุ, Seal triggers, Sovereign tiers, ...) are kept as they are.
Rows marked "ตรวจ" fell back to a default category or matched several, so check them by hand.
"""
import csv, json, re, sys

KEEP = re.compile(r'^(ความสามารถหลัก|Karma Burst|T[123]\b.*|โจมตีก่อน|ชำระล้าง|ล็อค|ปราการคุ้มกัน.*|หลบหลีก|ทะลวง.*|'
                  r'ข้ามธาตุ.*|พันธมิตร.*|เปิดใช้เมื่อ.*)$')
# first match wins; order matters (Reincarnate before summon, death before pool, ...)
RULES = [
    ('จุติ', r'(ลงสนาม|เรียก|อัญเชิญ)[^.]{0,25}(ด้วย|ผ่าน|โดย)(วิธี)? ?Reincarnate|เมื่อ(ถูก)?(เรียก|ลง)ผ่าน Reincarnate'),
    ('อัญเชิญ', r'เมื่อ(การ์ดใบนี้)?(ถูกเรียก)?ลงสนาม|เมื่อลงสนาม|เมื่อถูกอัญเชิญ'),
    ('ดับสูญ', r'เมื่อการ์ดใบนี้ถูกทำลาย|เมื่อการ์ดใบนี้ตก(ลง)?สู่ Karma Pool'),
    ('วิญญาณ', r'(การ์ดใบนี้|ใบนี้)[^.]{0,15}(อยู่|อยู่ใน) ?Karma Pool|ขณะอยู่ใน(สนามหรือใน)? ?Karma Pool|จากใน Karma Pool'),
    ('พิชิต', r'(ทำลาย|โจมตีและทำลาย|โจมตีทำลาย) ?Spirit (ของ)?(คู่ต่อสู้|ศัตรู)[^.]{0,25}(สำเร็จ|ได้)|เมื่อชนะการต่อสู้'),
    ('ทลายศาล', r'โจมตี(ใส่)? ?Shrine[^.]{0,20}(สำเร็จ|โดยตรง)|ทำลาย Shrine[^.]{0,10}สำเร็จ'),
    ('บุก', r'เมื่อ(การ์ดใบนี้)?ประกาศโจมตี|เมื่อการ์ดใบนี้โจมตี'),
    ('ตั้งรับ', r'เมื่อการ์ดใบนี้ถูก(คู่ต่อสู้)?(ประกาศ)?โจมตี|เมื่อถูกโจมตี|เมื่อป้องกัน'),
    ('รุ่งอรุณ', r'Dawn Phase'),
    ('สนธยา', r'เมื่อจบตา|Dusk Phase|ท้ายเทิร์น'),
    ('พิธี', r'ในช่วง Rite Phase|จ่าย \d+ Gem ?:|สามารถสั่ง|สามารถจ่าย'),
]
DEFAULT = 'ต่อเนื่อง'

def classify(seg):
    hits = [name for name, pat in RULES if re.search(pat, seg)]
    return (hits[0], len(hits) > 1) if hits else (DEFAULT, True)

def tag(text):
    if text and '[' not in text:            # no ability name at all: tag the whole sentence
        cat, unsure = classify(text)
        return '【%s】 %s' % (cat, text), [cat], unsure
    parts = re.split(r'(\[[^\]]+\])', text)
    out, cats, check = [], [], False
    for i, part in enumerate(parts):
        m = re.fullmatch(r'\[([^\]]+)\]', part)
        if not m:
            out.append(part); continue
        name = m.group(1).strip()
        if name == 'ต่อเนื่อง':
            out.append('【ต่อเนื่อง】'); cats.append('ต่อเนื่อง'); continue
        if KEEP.match(name):
            out.append(part); continue
        seg = parts[i + 1] if i + 1 < len(parts) else ''
        cat, unsure = classify(seg)
        check = check or unsure
        cats.append(cat)
        out.append('【%s】' % cat)
    return ''.join(out), cats, check

def main(src):
    rows = [r for r in csv.reader(open(src, encoding='utf-8'))][1:]
    rows = [r for r in rows if r and r[0]]
    new = {}
    with open('abilities-categorized.csv', 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f)
        w.writerow(['รหัส', 'ชื่อไทย', 'ความสามารถเดิม', 'ความสามารถใหม่ (มีหมวด)', 'หมวด', 'ตรวจด้วยมือ'])
        for r in rows:
            cid = re.match(r'(PRL-\d+)', r[0]).group(1)
            text, cats, check = tag(r[5].strip())
            new[cid] = text
            w.writerow([r[0], r[1].strip(), r[5].strip(), text, ', '.join(dict.fromkeys(cats)), 'ตรวจ' if check else ''])
    raw = open('cards.js', encoding='utf-8').read()
    cards = json.loads(raw[len('const CARDS='):-1])
    for c in cards:
        if c['id'] in new:
            c['text'] = new[c['id']]
    open('cards.js', 'w', encoding='utf-8').write('const CARDS=' + json.dumps(cards, ensure_ascii=False) + ';')
    flagged = sum(1 for r in csv.reader(open('abilities-categorized.csv', encoding='utf-8-sig')) if r[-1] == 'ตรวจ')
    print(len(new), 'cards tagged;', flagged, 'to check by hand')

if __name__ == '__main__':
    main(sys.argv[1])
