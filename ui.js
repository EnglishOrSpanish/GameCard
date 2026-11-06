// ===== Board UI (positions taken from board.webp, 1672x941) =====
const Z={gem:[50,60,305,205],shrine:[50,230,305,825],
  sp:[[375,105,645,285],[700,105,970,285],[1025,105,1297,285],[375,337,645,517],[700,337,970,517],[1025,337,1297,517]],
  sanct:[375,552,525,710],sov:[545,552,850,710],trap:[[872,552,998,710],[1018,552,1146,710],[1166,552,1297,710]],
  hand:[330,760,1343,905],deck:[1367,60,1623,357],pool:[1367,380,1623,520],trash:[1367,545,1623,830]};
const zs=a=>`left:${a[0]/16.72}%;top:${a[1]/9.41}%;width:${(a[2]-a[0])/16.72}%;height:${(a[3]-a[1])/9.41}%`;
const zone=(a,html,cls='')=>`<div class="zn ${cls}" style="${zs(a)}">${html}</div>`;
const dot=c=>`<i class="dot ${(c.type==='sovereign'||(c.el==='Agni'&&IMPLEMENTED.has(num(c))))?'ok':'warn'}" title="${(c.type==='sovereign'||(c.el==='Agni'&&IMPLEMENTED.has(num(c))))?'ทำงานอัตโนมัติ':'ความสามารถยังไม่ทำงาน'}"></i>`;
const typeLabel=c=>c.type==='spirit'?`T${c.tier}${c.tribe?' · '+c.tribe:''}`:c.type==='mantra'?'Mantra':c.type==='sanct'?'Sanctuary':c.type==='seal'?'Seal':'Sovereign';

function spiritHtml(pi,i,sp,mini){
  const c=sp.card,h=sp.silenced?{}:H(c),A=stat(pi,sp,'atk'),D=stat(pi,sp,'def');
  const hlT=G.sel&&G.sel.kind==='atk'&&pi!==G.t&&legalTargets(G.t,fighter(G.t,G.sel.slot)).spirits.some(x=>x.slot===i);
  const hlP=G.pick&&G.pick.cands.some(x=>x.pi===pi&&x.slot===i),hlM=G.sel&&G.sel.kind==='manualKill';
  const can=pi===G.t&&G.phase==='war'&&canAttack(pi,sp),selA=G.sel&&G.sel.kind==='atk'&&pi===G.t&&G.sel.slot===i;
  const tags=(sp.locked?'🔒 ล็อค ':'')+(sp.silenced?'🔇 ปิดความสามารถ ':'')+(sp.attacks?`⚔ ${sp.attacks}/${maxAtk(pi,sp)}`:'');
  let btn='';if(h.act&&pi===G.t&&!mini&&h.act.can({pi,sp,slot:i}))btn=`<button class="ab" onclick="event.stopPropagation();act(()=>onSpiritAct(${pi},${i}))">${h.act.label}</button>`;
  const cls=['sc',hlT||hlP||hlM?'hl':'',can?'can':'',selA?'sel':'',sp.attacks>=maxAtk(pi,sp)&&pi===G.t&&G.phase==='war'?'used':'',c.tier===3?'t3':c.tier===2?'t2':''].join(' ');
  return `<div class="${cls}" onmouseover="show(${c.uid})" onclick="spClick(${pi},${i})">${dot(c)}
    <div class="nm">${esc(c.th)}</div><div class="tr">${typeLabel(c)}</div>
    <div class="pw"><span class="a ${A>c.atk?'up':A<c.atk?'dn':''}">⚔ ${A}</span><span class="d ${D>c.def?'up':D<c.def?'dn':''}">🛡 ${D}</span></div>
    ${mini?'':`<div class="tx">${esc(c.text)}</div>`}<div class="tg">${tags}</div>${btn}</div>`;
}
function handHtml(pi,active){
  const p=P(pi);
  return p.hand.map((c,i)=>{
    const ok=active&&playable(c);
    const st=c.type==='spirit'?`⚔${c.atk} 🛡${c.def}${c.tier>1?` · จ่าย ${c.cost}-${c.re}`:''}`:c.type==='seal'?`เปิด ${c.act} Gem`:`ค่า ${c.cost}`;
    return `<div class="hc ${ok?'ok':''} ${c.type}" onmouseover="show(${c.uid})" ${active?`onclick="act(()=>onHand(${i}))"`:''}>${dot(c)}
      <div class="nm">${esc(c.th)}</div><div class="tr">${typeLabel(c)} · ${st}</div><div class="tx">${esc(c.text)}</div></div>`}).join('');
}
function boardHtml(pi,main){
  const p=P(pi),active=pi===G.t,showAll=active||G.debug,s=p.sov,sh=SOVH[num(s.card)]||{};
  let h=`<div class="who ${active?'on':''}">P${pi+1} · ${p.el}${active?' · เทิร์นนี้':''}</div>`;
  h+=zone(Z.gem,`<div class="cnt"><span>${p.gems}</span><small>Karma Gem</small></div>`,'gem');
  h+=zone(Z.shrine,`<div class="shr"><div class="cnt"><span>${p.shrine.length}</span><small>${p.shrine.length?'Shrine':'Shrine หมด · ตี Sovereign = ชนะ'}</small></div>${p.shrine.map((c,k)=>`<div class="tile" title="${G.debug?esc(c.en):'Shrine คว่ำ'}">${G.debug?esc(c.th):''}</div>`).join('')}</div>`);
  Z.sp.forEach((a,i)=>{const sp=p.field[i];h+=zone(a,sp?spiritHtml(pi,i,sp,!main):'')});
  h+=zone(Z.sanct,p.sanct?`<div class="sc t2" onmouseover="show(${p.sanct.uid})">${dot(p.sanct)}<div class="nm">${esc(p.sanct.th)}</div><div class="tr">Sanctuary</div>${main?`<div class="tx">${esc(p.sanct.text)}</div>`:''}</div>`:'');
  let sb='';for(let k=1;k<=s.tier;k++)if(sh[k]&&sh[k].act&&active&&sh[k].act.can({pi}))sb+=`<button class="ab" onclick="act(()=>onSovAct(${k}))">${sh[k].act.label}</button>`;
  const need=s.tier<3?s.card.asc[s.tier-1]:0;
  h+=zone(Z.sov,`<div class="sc sov" onmouseover="show(${s.card.uid})"><div class="nm">${esc(s.card.th)}</div><div class="tr">Sovereign T${s.tier}</div>
    <div class="pw"><span class="a">⚔ ${s.card.hp[s.tier-1]}</span></div>${main?`<div class="tx">${esc(s.card.text)}</div>`:''}
    ${active&&G.phase==='rite'&&s.tier<3?`<button class="ab main" onclick="act(onAscendClick)">Ascend → T${s.tier+1} (${need} Gem)</button>`:''}${active&&G.phase==='war'?`<button class="ab main" ${canSovAttack(pi)?'':'disabled'} onclick="selectSov();render()">⚔ Sovereign โจมตี (1 Gem)</button>`:''}${sb}</div>`);
  Z.trap.forEach((a,k)=>{const c=p.seals[k];let inner='';
    if(c){if(showAll){const man=active&&!H(c).trigger&&G.win===null;
      inner=`<div class="sc seal" onmouseover="show(${c.uid})">${dot(c)}<div class="nm">${esc(c.th)}</div><div class="tr">เปิด ${c.act} Gem</div>${man?`<button class="ab" onclick="act(()=>manualSeal(${k}))">เปิด</button>`:''}</div>`}
      else inner='<div class="sc back">Seal<br>คว่ำ</div>'}
    h+=zone(a,inner)});
  h+=zone(Z.hand,showAll?`<div class="hand">${handHtml(pi,active)}</div>`:`<div class="cnt hid"><span>${p.hand.length}</span><small>การ์ดในมือ (ซ่อน)</small></div>`,'handz');
  h+=zone(Z.deck,`<div class="cnt"><span>${p.deck.length}</span><small>Deck</small></div>`);
  h+=zone(Z.pool,`<div class="cnt sm"><span>${p.pool.length}</span><small>Karma Pool</small></div><div class="chips">${p.pool.map((c,j)=>{
    const ph=H(c).poolAct,ok=active&&ph&&G.phase==='rite'&&ph.can({pi,card:c});
    return `<span class="${ok?'hl':''}" onmouseover="show(${c.uid})" ${ok?`onclick="act(()=>onPoolAct(${pi},${j}))"`:''}>${esc(c.th)}${ok?' ▶'+ph.label:''}</span>`}).join('')}</div>`);
  h+=zone(Z.trash,`<div class="cnt"><span>${p.disc.length}</span><small>Trash</small></div>${G.debug?`<div class="chips">${p.disc.map(c=>`<span>${esc(c.th)}</span>`).join('')}</div>`:''}`);
  return h;
}
function render(){
  if(!G)return;
  $('msg').textContent=G.win!==null?`🏆 P${G.win+1} ชนะ!`:G.msg;
  $('hint').textContent=hint();
  const atkSel=G.sel&&G.sel.kind==='atk';
  $('bar').innerHTML=G.win!==null?'':`<div class="turn">เทิร์น ${G.turnNo} · <b>P${G.t+1}</b> · <span class="ph ${G.phase}">${G.phase.toUpperCase()}</span></div>
    <button class="main big" onclick="act(nextPhase)">${G.phase==='rite'?'ไป War ▶':G.phase==='war'?'ไป Dusk ▶':'จบเทิร์น ✔'}</button>
    ${atkSel?'<button class="main" onclick="act(atkShrine)">⚔ โจมตี Sovereign</button>':''}
    <button onclick="G.sel=null;say('');render()">ยกเลิกการเลือก</button>
    <details class="mn"><summary>เครื่องมือ manual</summary><button onclick="manual('g+');render()">Gem+1</button><button onclick="manual('g-');render()">Gem-1</button><button onclick="manual('draw');render()">จั่ว 1</button><button onclick="manual('kill');render()">ทำลาย Spirit</button></details>`;
  const me=G.t,foe=1-G.t;
  $('b1').innerHTML=boardHtml(foe,false);$('b0').innerHTML=boardHtml(me,true);
  $('b0').className='board main'+(G.phase==='war'?' war':'');$('b1').className='board opp';
  $('log').innerHTML=G.log.slice(-80).map(esc).join('<br>');$('log').scrollTop=1e9;
  const m=$('modal');
  if(G.modal){m.className='';m.style.display='flex';m.innerHTML=`<div class="mbox"><div class="mt">${esc(G.modal.title)}</div>${G.modal.labels.map((l,i)=>`<button onclick="modalClick(${i})">${esc(l)}</button>`).join('')}${G.modal.labels.length>2?'<button class="skip" onclick="modalClick(-1)">ข้าม</button>':''}</div>`}
  else if(G.pick){m.className='top';m.style.display='flex';m.innerHTML=`<div class="mbox"><div class="mt">${esc(G.pick.title)}</div>คลิก Spirit ที่มีกรอบเขียวบนกระดาน ${G.pick.allowSkip?'<button class="skip" onclick="skipPick()">ข้าม</button>':''}</div>`}
  else{m.style.display='none';m.className=''}
}
function fullscreen(){const d=document;if(d.fullscreenElement)d.exitFullscreen();else d.documentElement.requestFullscreen()}
