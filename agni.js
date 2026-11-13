// ===== Agni (fire) card abilities =====
const fire=c=>isEl(c,'Agni');
const def=(n,h)=>{HND[n]=h;IMPLEMENTED.add(n)};
const eff=(pi,extra)=>({type:'effect',byPi:pi,...extra});
const mcause=ctx=>eff(ctx.pi,{mantra:true,cost:ctx.cost!==undefined?ctx.cost:ctx.card.cost});
const foeSp=(pi,f=()=>true)=>spirits(1-pi).filter(x=>f(x.sp,x));
const ownSp=(pi,f=()=>true)=>spirits(pi).filter(x=>f(x.sp,x));
const kala=c=>num(c)===8;
const kill=(x,cause)=>destroySp(x.pi,x.slot,cause);
async function pickKill(pi,title,cands,cause){const t=await pickSpirit(title,cands);if(t)await kill(t,cause);return t}
async function pickTemp(pi,title,cands,k,v){const t=await pickSpirit(title,cands);if(t){t.sp.temp[k]+=v;log(t.sp.card.en+' '+k.toUpperCase()+(v>=0?' +':' ')+v)}return t}
async function destroyFoeSeals(pi,sanctToo){const f=P(1-pi);while(f.seals.length)f.disc.push(f.seals.shift());if(sanctToo&&f.sanct){f.disc.push(f.sanct);f.sanct=null}}
const cardList=(arr)=>arr.map(c=>c.th+' ('+c.en+')');

// ---- Spirits T1 ----
def(2,{onAttack(ctx,s){s.sp.bt.atk+=300},
  async onDestroyed(ctx){
    if(G.phase!=='rite'||G.t!==ctx.pi)return;const p=P(ctx.pi);
    const c=p.pool.find(kala);if(!c||!canReinc(ctx.pi,c,{pay:2}))return;
    if(!(await ask('จ่าย 2 Gem เพื่อ Reincarnate กาลอัคนี จาก Karma Pool? (ใช้โควตา Reincarnate ของเทิร์นนี้)')))return;
    await doReinc(ctx.pi,c,{pay:2});}});
def(3,{mustAttack:true,onDestroyed(ctx){if(ctx.cause.doubleKO)gain(ctx.pi,1)}});
def(4,{act:{label:'สังเวยตัวเอง',can:c=>c.pi===G.t&&G.phase==='rite',
  async run(c){await destroySp(c.pi,c.slot,{type:'sac'});P(c.pi).mdisc+=1;if(P(c.pi).pool.length>=3)draw(c.pi,1)}}});
def(5,{onDestroyed(ctx){if(ctx.cause.type==='combat')gain(ctx.pi,1)}});
def(6,{passive:({pi,sp})=>fireSp(pi).some(x=>x.sp!==sp)?{atk:300,def:200}:null});
def(7,{async onSummon(ctx){if(G.phase==='rite')await pickTemp(ctx.pi,'เลือก Spirit ธาตุไฟของเรา +400 ATK',fireSp(ctx.pi),'atk',400)}});
def(8,{onSummon(ctx,s){if(ctx.how==='reinc')s.sp.extra+=1}});
def(9,{});
def(10,{async onWin(ctx,s){const f=P(ctx.fp);if(!f.seals.length)return;
  const k=await choose('ทำลาย Seal ที่คว่ำอยู่ของศัตรู 1 ใบ',f.seals.map((x,i)=>'Seal #'+(i+1)));if(k>=0){const c=f.seals.splice(k,1)[0];f.disc.push(c);log('ทำลาย Seal: '+c.en)}}});
def(11,{async afterBattle(ctx,s){const b=s.sp===ctx.a?ctx.boostA:ctx.boostD;if(b>=1)await pickKill(s.pi,'ทำลาย Spirit Tier 1 ของศัตรู',foeSp(s.pi,x=>x.card.tier===1),eff(s.pi))}});
def(12,{canDirect:({pi})=>P(pi).pool.length>=5,async onWin(ctx,s){await breakShrine(ctx.fp,{burst:false})}});
def(13,{baseEls:['Agni','Tamas'],async onSummon(ctx){if(ctx.how!=='reinc')return;
  const n=Math.min(2,P(1-ctx.pi).gems);P(1-ctx.pi).gems-=n;if(n)gain(ctx.pi,n);
  for(const x of foeSp(ctx.pi,c=>c.card.cost<=2))await kill(x,eff(ctx.pi))}});
def(14,{baseEls:['Agni','Vayu'],firstStrike:()=>true,onWin(ctx,s){s.sp.extra+=1}});
// ---- Mantras ----
def(15,{async main(ctx){await pickKill(ctx.pi,'ทำลาย Spirit ศัตรู DEF<=1500',foeSp(ctx.pi,(sp)=>stat(1-ctx.pi,sp,'def')<=1500),mcause(ctx))},
  async burst(ctx){await pickKill(ctx.pi,'Burst: ทำลาย Spirit ศัตรู DEF<=2000',spirits(ctx.foe).filter(x=>stat(ctx.foe,x.sp,'def')<=2000),eff(ctx.pi))}});
def(16,{can:({pi})=>fireSp(pi).length>0,async main(ctx){await pickTemp(ctx.pi,'เลือก Spirit ธาตุไฟ +1000 ATK',fireSp(ctx.pi),'atk',1000)},burst(ctx){gain(ctx.pi,2)}});
def(17,{can:({pi})=>fireSp(pi).length>0,async main(ctx){const t=await pickSpirit('ทำลาย Spirit ธาตุไฟของเรา 1 ใบเพื่อจั่ว 2',fireSp(ctx.pi),false);if(t){await kill(t,{type:'sac'});draw(ctx.pi,2)}},
  burst(ctx){draw(ctx.pi,2);gain(ctx.pi,1)}});
def(78,{async main(ctx){for(const pi of [ctx.pi,1-ctx.pi])for(const x of spirits(pi))if(stat(pi,x.sp,'def')<=2000)await kill(x,mcause(ctx))},
  async burst(ctx){for(const x of spirits(ctx.foe).filter(x=>x.sp.card.cost<=2))await kill(x,eff(ctx.pi))}});
async function reincFromPool(pi,pay0,reduce){
  const p=P(pi);if(p.field.indexOf(null)<0)return;
  const payOf=c=>pay0?0:reincPay(pi,c,reduce);
  const cands=p.pool.filter(c=>c.type==='spirit'&&c.tier===2&&fire(c)&&canReinc(pi,c,{pay:payOf(c)}));
  if(!cands.length){log('Reincarnate ไม่ได้ (ไม่มี T2 ธาตุไฟ/ฐาน/Gem หรือใช้โควตาแล้ว)');return}
  const k=await choose('เลือก Spirit T2 ธาตุไฟจาก Karma Pool',cardList(cands));if(k<0)return;
  await doReinc(pi,cands[k],{pay:payOf(cands[k])});
}
def(79,{async main(ctx){await reincFromPool(ctx.pi,false,2)},async burst(ctx){await reincFromPool(ctx.pi,true,0)}});
def(80,{can:({pi})=>fireSp(pi).length>0,async main(ctx){const t=await pickTemp(ctx.pi,'เลือก Spirit ธาตุไฟ +800 ATK',fireSp(ctx.pi),'atk',800);if(t&&t.sp.card.en.startsWith('KALA-AGNI'))t.sp.noDie=true},
  async burst(ctx){const f=P(ctx.foe),opts=f.seals.map((x,i)=>'Seal #'+(i+1));if(f.sanct)opts.push('Sanctuary: '+f.sanct.th);
    if(opts.length){const k=await choose('Burst: ทำลาย Seal/Sanctuary ของศัตรู',opts);if(k>=0){if(k<f.seals.length)f.disc.push(f.seals.splice(k,1)[0]);else{f.disc.push(f.sanct);f.sanct=null}}}gain(ctx.pi,1)}});
def(81,{async main(ctx){for(let k=0;k<2;k++){const t=await pickSpirit('ลด DEF -1000 (ใบที่ '+(k+1)+'/2)',foeSp(ctx.pi,(sp)=>sp.temp.def>-9999).filter(x=>!(ctx._h&&ctx._h.includes(x.sp))));
    if(!t)break;(ctx._h=ctx._h||[]).push(t.sp);t.sp.temp.def-=1000;if(stat(t.pi,t.sp,'def')<=0)await kill(t,mcause(ctx))}},
  async burst(ctx){await pickKill(ctx.pi,'Burst: ทำลาย Spirit Tier 1 ของศัตรู',spirits(ctx.foe).filter(x=>x.sp.card.tier===1),eff(ctx.pi))}});
def(82,{can:({pi,card})=>ownSp(pi,sp=>sp.card.tier===1).length>0||P(pi).hand.some(c=>c!==card&&fire(c)),
  async main(ctx){const p=P(ctx.pi),t1=ownSp(ctx.pi,sp=>sp.card.tier===1),fh=p.hand.filter(c=>c!==ctx.card&&fire(c));
    const opts=[],act=[];if(t1.length){opts.push('ทำลาย Spirit Tier 1 ของเรา');act.push('s')}if(fh.length){opts.push('ทิ้งการ์ดไฟจากมือ');act.push('h')}
    const k=await choose('เลือกต้นทุน',opts);if(k<0)return;
    if(act[k]==='s'){const t=await pickSpirit('เลือก Spirit Tier 1',t1,false);if(!t)return;await kill(t,{type:'sac'})}
    else{const j=await choose('ทิ้งการ์ดไฟ',cardList(fh));p.hand.splice(p.hand.indexOf(fh[Math.max(0,j)]),1);p.disc.push(fh[Math.max(0,j)])}
    gain(ctx.pi,2)},burst(ctx){gain(ctx.pi,2)}});
async function searchDeck(pi,filter,discount){
  const p=P(pi),c=p.deck.filter(filter);if(!c.length){log('ไม่พบการ์ดในเด็ค');return}
  const k=await choose('ค้นหาจากเด็ค',cardList(c));if(k<0)return;
  const card=c[k];p.deck.splice(p.deck.indexOf(card),1);p.hand.push(card);shuffle(p.deck);if(discount)card.discTurn=G.turnNo+1;log('P'+(pi+1)+' ค้นหา '+card.en);
}
def(83,{main:ctx=>searchDeck(ctx.pi,c=>c.type==='spirit'&&c.tier===3&&fire(c),false),burst:ctx=>searchDeck(ctx.pi,c=>fire(c),true)});
def(84,{can:({pi})=>ownSp(pi,sp=>sp.card.tier===1).length>0,async main(ctx){
    const t=await pickSpirit('ทำลาย Spirit Tier 1 ของเรา',ownSp(ctx.pi,sp=>sp.card.tier===1),false);if(!t)return;await kill(t,{type:'sac'});
    await pickKill(ctx.pi,'ทำลาย Spirit ศัตรูที่ค่าร่าย<=2',foeSp(ctx.pi,sp=>sp.card.cost<=2),mcause(ctx))},
  async burst(ctx){await pickKill(ctx.pi,'Burst: ทำลาย Spirit ศัตรูค่าร่าย<=2',spirits(ctx.foe).filter(x=>x.sp.card.cost<=2),eff(ctx.pi))}});
def(85,{async main(ctx){const f=P(1-ctx.pi),opts=f.seals.map((x,i)=>'Seal #'+(i+1));if(f.sanct)opts.push('Sanctuary: '+f.sanct.th);
  if(!opts.length)return log('ไม่มีเป้าหมาย');const k=await choose('ทำลาย Seal/Sanctuary ของศัตรู',opts);
  if(k<0)return;if(k<f.seals.length)f.disc.push(f.seals.splice(k,1)[0]);else{f.disc.push(f.sanct);f.sanct=null}}});
HND[86]={can:({pi})=>P(pi).pool.length>=4,main(ctx){log('(ความเสียหายต่อ Sovereign ยังไม่ทำ — Sovereign ไม่มี HP)')},burst(){log('(ความเสียหายต่อ Sovereign ยังไม่ทำ)')}};
def(87,{main(ctx){P(ctx.pi).tf.oath=true;log('เทิร์นนี้ Spirit ไฟ +400 ATK และจั่วเมื่อชนะการต่อสู้ (สูงสุด 2)')}});
def(88,{async main(ctx){const p=P(ctx.pi),c=p.disc.filter(x=>x.type==='spirit'&&fire(x)).concat(p.pool.filter(fire));
  if(c.length){const k=await choose('นำ Spirit ธาตุไฟกลับขึ้นมือ',cardList(c));if(k>=0){const x=c[k];let j=p.disc.indexOf(x);if(j>=0)p.disc.splice(j,1);else p.pool.splice(p.pool.indexOf(x),1);p.hand.push(x)}}draw(ctx.pi,1)},
  burst(ctx){draw(ctx.pi,2)}});
def(89,{async main(ctx){const t=await pickKill(ctx.pi,'ทำลาย Spirit ศัตรู DEF<=1500 แล้วย้ายเข้า Karma Pool ของเรา',foeSp(ctx.pi,sp=>stat(1-ctx.pi,sp,'def')<=1500),mcause(ctx));
    if(t){const c=P(1-ctx.pi).pool.pop();if(c){P(ctx.pi).pool.push(c);log(c.en+' ย้ายมา Karma Pool ของเรา')}}},
  async burst(ctx){const n=Math.min(1,P(ctx.foe).gems);P(ctx.foe).gems-=n;if(n)gain(ctx.pi,n);
    await pickKill(ctx.pi,'Burst: ทำลาย Spirit Tier 1 ของศัตรู',spirits(ctx.foe).filter(x=>x.sp.card.tier===1),eff(ctx.pi))}});
// ---- Sanctuary ----
def(18,{async spiritDestroyed(ctx,s){if(ctx.pi===s.pi&&fire(ctx.card)&&ctx.phase==='war')for(const x of spirits(s.pi))x.sp.temp.atk+=300}});
def(19,{spiritDestroyed(ctx,s){const c=ctx.cause;if(c.type==='combat'&&c.by.pi===s.pi&&ctx.pi!==s.pi&&fire(c.by.sp.card)&&!P(s.pi).tf.s19){P(s.pi).tf.s19=1;gain(s.pi,1)}}});
def(90,{aura:(s,tp,tsp)=>tp===s.pi&&fire(tsp.card)?{atk:200}:null});
def(91,{reincSummoned(ctx,s){if(ctx.pi===s.pi&&fire(ctx.sp.card)&&!P(s.pi).tf.s91){P(s.pi).tf.s91=1;ctx.sp.temp.atk+=500}}});
def(92,{shrineDestroyed(ctx,s){if(ctx.pi===s.pi)gain(s.pi,1)}});
HND[93]={};
def(94,{aura:()=>({def:-300})});
// ---- Seals ----
def(20,{trigger:'myAttacked',async effect(ctx,def){await destroySp(def,ctx.t.slot,eff(def));ctx.cancelled=true}});
def(95,{trigger:'oppAttack',cond:(ctx)=>stat(ctx.pi,ctx.a,'atk')<=2200,async effect(ctx,def){await destroySp(ctx.pi,ctx.slot,eff(def));ctx.cancelled=true}});
def(96,{trigger:'myAttacked',effect(ctx){ctx.d.bt.def+=1000}});
def(97,{trigger:'shrineDirect',cond:(ctx,def)=>P(def).pool.some(c=>c.type==='spirit'&&c.tier<=2&&fire(c))&&P(def).field.indexOf(null)>=0,
  async effect(ctx,def){const p=P(def),c=p.pool.filter(c=>c.type==='spirit'&&c.tier<=2&&fire(c));const k=await choose('เลือก Spirit จาก Karma Pool',cardList(c));
    if(k<0)return;if(await summonFree(def,c[k],'pool')){const slot=p.field.findIndex(x=>x&&x.card===c[k]);ctx.t={kind:'sp',slot};ctx.d=p.field[slot]}}});
def(98,{trigger:'shrineBroken',effect(ctx,def){P(def).tf.shrineLock=true;draw(def,1)}});
def(99,{trigger:'mantraPlayed',async effect(ctx,def){ctx.cancelled=true;const t=await pickSpirit('ทำลาย Spirit Tier 1 ของเรา',ownSp(def,sp=>sp.card.tier===1),false);if(t)await kill(t,{type:'sac'})}});
def(100,{trigger:'oppAttack',cond:(ctx,def)=>P(def).shrine.length<=1,async effect(ctx,def){
  for(const x of spirits(ctx.pi).filter(x=>x.sp.attacks>0))await kill(x,eff(def));G.warEnded=true;ctx.cancelled=true;await ascend(def)}});
// ---- Spirits T1 (cont.) ----
def(26,{});
def(27,{async onDestroyed(ctx){if(ctx.cause.type==='combat')await pickTemp(ctx.pi,'ลด DEF ศัตรู -500',foeSp(ctx.pi),'def',-500)}});
def(28,{async onSummon(ctx){if(G.phase==='rite')await pickTemp(ctx.pi,'เลือก Spirit ธาตุไฟใบอื่น +200 ATK',fireSp(ctx.pi).filter(x=>x.sp!==ctx.sp),'atk',200)}});
def(29,{async onSummon(ctx){const p=P(ctx.pi);if(!p.deck.length)return;const top=p.deck[0];
  if(await ask('ไพ่บนสุดคือ "'+top.th+'" — ส่งลงสุสาน? (ไม่ = วางไว้ตามเดิม)')){p.deck.shift();p.disc.push(p.deck.length?top:top)}}});
def(30,{onBattleWith(o){o.temp.def-=400}});
def(31,{});
def(32,{onDefend(ctx,s){s.sp.bt.def+=400}});
def(33,{async onShrineHit(ctx,s){draw(s.pi,1);const p=P(s.pi);if(!p.hand.length)return;const k=await choose('ทิ้งไพ่ในมือ 1 ใบ',cardList(p.hand));const c=p.hand.splice(Math.max(0,k),1)[0];p.disc.push(c)}});
def(34,{onAttack(ctx,s){if(ctx.d&&stat(ctx.fp,ctx.d,'def')<=900)s.sp.bt.atk+=400}});
def(35,{onBaseUsed(ctx){gain(ctx.pi,1)}});
def(36,{passive:({pi})=>P(pi).shrine.length<P(1-pi).shrine.length?{atk:500}:null});
def(38,{async onSummon(ctx){const p=P(ctx.pi),top=p.deck.splice(0,3);const m=top.filter(c=>c.type==='mantra'&&fire(c));
  if(m.length){const k=await choose('นำ Mantra ธาตุไฟขึ้นมือ 1 ใบ',cardList(m));if(k>=0){const c=m[k];top.splice(top.indexOf(c),1);p.hand.push(c)}}
  p.deck.push(...top)}});
def(39,{onBoost(ctx,sp,n){sp.bt.atk+=200*n}});
def(40,{summoned(ctx,s){if(ctx.pi===s.pi&&ctx.tier===2&&!s.sp.tf.v40){s.sp.tf.v40=1;s.sp.temp.atk+=300}}});
def(41,{poolAct:{label:'ลุกจากหลุมกรรม (1 Gem)',can:({pi})=>P(pi).gems>=1&&P(pi).field.indexOf(null)>=0,
  async run({pi,card}){P(pi).gems--;if(await summonFree(pi,card,'pool')){const sp=P(pi).field.find(x=>x&&x.card===card);if(sp){sp.banish=true;sp.endBanish=true}}}}});
def(42,{spiritDestroyed(ctx,s){if(ctx.pi===s.pi&&ctx.sp!==s.sp&&!s.sp.tf.d42){s.sp.tf.d42=1;draw(s.pi,1)}}});
def(43,{onAttack(ctx,s){if(s.sp.sumTurn===G.turnNo)s.sp.bt.atk+=300}});
def(44,{});
def(45,{passive:({pi})=>P(pi).sanct?{def:400}:null});
def(46,{firstStrike:(ctx,s)=>s.sp===ctx.a&&ctx.boostA>=1});
def(47,{async onDestroyed(ctx){const f=P(1-ctx.pi);if(P(ctx.pi).gems>=1&&f.sanct&&await ask('จ่าย 1 Gem ทำลาย Sanctuary ของศัตรู?')){P(ctx.pi).gems--;f.disc.push(f.sanct);f.sanct=null}}});
def(48,{aura:(s,tp,tsp)=>tp===s.pi&&fire(tsp.card)&&tsp.card.tier===2?{atk:200,def:200}:null});
def(49,{afterBattle(ctx,s){if(s.sp===ctx.a&&ctx.boostA>=2)s.sp.extra+=1}});
def(50,{onBaseUsed(ctx){if(kala(ctx.target))draw(ctx.pi,1)}});
// ---- Spirits T2 ----
def(51,{async onSummon(ctx,s){if(ctx.how!=='reinc')return;await pickKill(ctx.pi,'ทำลาย Spirit Tier 1 ของศัตรู',foeSp(ctx.pi,x=>x.card.tier===1),eff(ctx.pi));s.sp.temp.atk+=300}});
def(52,{async onWin(ctx,s){if(P(s.pi).gems>=1&&P(ctx.fp).shrine.length&&await ask('จ่าย 1 Gem สุ่มทำลาย Shrine ศัตรู?')){P(s.pi).gems--;await breakShrine(ctx.fp,{by:{pi:s.pi,sp:s.sp},burst:true})}}});
def(53,{act:{label:'เร่งไฟเมรุมาศ (T1→+2 Gem)',can:c=>c.pi===G.t&&G.phase==='rite'&&!c.sp.tf.a&&ownSp(c.pi,sp=>sp.card.tier===1).length>0,
  async run(c){const t=await pickSpirit('ทำลาย Spirit Tier 1 ของเรา',ownSp(c.pi,sp=>sp.card.tier===1),false);if(t){c.sp.tf.a=1;await kill(t,{type:'sac'});gain(c.pi,2)}}}});
def(54,{protect:(cause,s)=>cause.type==='effect'&&cause.mantra&&cause.byPi!==s.pi&&cause.cost<=2});
def(55,{async onAttack(ctx,s){await pickTemp(s.pi,'ลด DEF ของ Spirit ศัตรู -800',foeSp(s.pi),'def',-800)}});
def(56,{async onSummon(ctx){if(ctx.how!=='reinc')return;const p=P(ctx.pi),c=p.disc.filter(x=>x.type==='mantra'&&fire(x));if(!c.length)return;
  const k=await choose('นำ Mantra ธาตุไฟกลับขึ้นมือ',cardList(c));if(k>=0){p.disc.splice(p.disc.indexOf(c[k]),1);p.hand.push(c[k])}}});
def(57,{async onAttack(ctx,s){if(!ctx.d)return;const others=foeSp(s.pi,x=>x!==ctx.d);if(!others.length)return;
  const t=await pickSpirit('ขวานคู่: เลือก Spirit ใบที่ 2 ที่จะโจมตีพร้อมกัน',others);if(t)ctx.second=t},
  async afterBattle(ctx,s){if(s.sp!==ctx.a||!ctx.second)return;const t=ctx.second;if(P(t.pi).field[t.slot]!==t.sp)return;
    const A=stat(s.pi,s.sp,'atk'),D=stat(t.pi,t.sp,'def');log('ใบที่ 2: ATK '+A+' vs DEF '+D);
    if(A>D)await destroySp(t.pi,t.slot,{type:'combat',by:{pi:s.pi,sp:s.sp}});else if(A<D)await destroySp(s.pi,s.slot,{type:'combat',by:{pi:t.pi,sp:t.sp}});
    else{await destroySp(t.pi,t.slot,{type:'combat',by:{pi:s.pi,sp:s.sp},doubleKO:true});await destroySp(s.pi,s.slot,{type:'combat',by:{pi:t.pi,sp:t.sp},doubleKO:true})}}});
def(58,{async onSummon(ctx){const t=await pickSpirit('เลือก Spirit ศัตรูที่จะสูญเสียความสามารถ',foeSp(ctx.pi));if(t)t.sp.silenced=true}});
def(59,{});
def(60,{passive:({pi})=>({atk:Math.min(1000,200*P(pi).pool.length)})});
def(61,{onAttack(ctx,s){if(!ctx.d||isEl(ctx.d.card,'Jyoti'))s.sp.temp.atk+=600}});
def(62,{async onSummon(ctx){const opts=[];const L=[];for(const pi of [1-ctx.pi,ctx.pi])if(P(pi).sanct){opts.push('P'+(pi+1)+': '+P(pi).sanct.th);L.push(pi)}
  if(!opts.length)return;const k=await choose('ทำลาย Sanctuary 1 ใบ',opts);if(k>=0){const q=P(L[k]);q.disc.push(q.sanct);q.sanct=null}}});
def(63,{act:{label:'ล่อลวง (DEF ศัตรู -ครึ่ง)',can:c=>c.pi===G.t&&G.phase==='rite'&&!c.sp.tf.a&&foeSp(c.pi).length>0,
  async run(c){const t=await pickSpirit('ลด DEF ครึ่งหนึ่ง',foeSp(c.pi));if(t){c.sp.tf.a=1;const d=stat(t.pi,t.sp,'def');t.sp.temp.def-=Math.floor(d/2);c.sp.tf.p63=t.sp.card.uid}}},
  spiritDestroyed(ctx,s){if(ctx.card.uid===s.sp.tf.p63&&ctx.cause.type==='combat'){s.sp.tf.p63=0;gain(s.pi,1)}}});
def(64,{async onDestroyed(ctx){if(P(ctx.pi).gems<2)return;const c=foeSp(ctx.pi,x=>x.card.atk<ctx.card.atk);if(!c.length)return;
  if(await ask('จ่าย 2 Gem ทำลาย Spirit ศัตรูที่ ATK ต่ำกว่า?')){P(ctx.pi).gems-=2;await pickKill(ctx.pi,'เลือกเป้าหมาย',c,eff(ctx.pi))}}});
def(65,{onSummon(ctx){if(ctx.how!=='reinc')return;const f=P(1-ctx.pi);if(!f.hand.length)return;const c=f.hand.splice(rnd(f.hand.length),1)[0];f.disc.push(c);log('ศัตรูทิ้ง '+c.en);if(c.type==='mantra')gain(ctx.pi,1)}});
def(66,{poolAct:{label:'Reincarnate (ฐานไฟออกนอกเกม)',
  can:({pi,card})=>canReinc(pi,card),
  run:({pi,card})=>doReinc(pi,card,{baseTo:'out'})}});
def(67,{passive:({pi})=>sovTier(pi)>=2?{atk:400,def:400}:null});
def(68,{act:{label:'ตีดาบ (1 Gem: ไฟทุกใบ +300)',can:c=>c.pi===G.t&&G.phase==='rite'&&!c.sp.tf.a&&P(c.pi).gems>=1,
  run(c){c.sp.tf.a=1;P(c.pi).gems--;for(const x of fireSp(c.pi))x.sp.temp.atk+=300}}});
def(69,{baseEls:['Agni','Nira'],async onSummon(ctx){const t=await pickSpirit('ติดสถานะ [ล็อค] ให้ Spirit ศัตรู',foeSp(ctx.pi));if(t){t.sp.locked=true;t.sp.lockedAt=G.turnNo}draw(ctx.pi,1)}});
def(70,{passive:({pi})=>(spirits(pi).some(x=>kala(x.sp.card))||P(pi).pool.some(kala))?{atk:500}:null});
// ---- Spirits T3 ----
def(71,{async onSummon(ctx){if(ctx.how!=='reinc'||P(ctx.pi).pool.length<4)return;
  for(const x of foeSp(ctx.pi,(sp)=>sp.card.tier<=2&&stat(1-ctx.pi,sp,'def')<=2200))await kill(x,eff(ctx.pi))}});
def(72,{maxAttacks:({pi,sp})=>Math.max(1,sp.hit.length+spirits(1-pi).filter(x=>!sp.hit.includes(x.sp.card.uid)).length),onWin(ctx,s){gain(s.pi,1)}});
def(73,{maxAttacks:({sp})=>sp.baseRef&&kala(sp.baseRef)?2:1});
def(74,{async onAttack(ctx,s){const fp=1-s.pi,f=P(fp);const o=['ทำลาย Shrine ของตัวเอง 1 ใบ'];const k=[0];
  if(f.gems>=2){o.push('จ่าย 2 Gem ทิ้ง');k.push(1)}o.push('ไม่ทำ (ATK ศัตรู +1200)');
  const c=await choose('P'+(fp+1)+' ต้องเลือกรับผล Asmodeus',o);
  if(c===0)await breakShrine(fp,{burst:true});else if(c===1&&k.length>1){f.gems-=2}else s.sp.temp.atk+=1200}});
def(75,{baseEls:['Agni','Dharti'],sealImmune:true,async onDusk(ctx,s){if(s.sp.battled)await breakShrine(1-s.pi,{burst:true})}});
def(77,{canSummon:pi=>sovTier(pi)>=3,canDirect:()=>true,async onSummon(ctx){await destroyFoeSeals(ctx.pi,true)}});
// ---- Sovereigns ----
SOVH[1]={1:{aura:(s,tp,tsp)=>tp===s.pi&&fire(tsp.card)?{atk:100}:null},2:{},
  3:{async onAscend({pi}){for(const q of [pi,1-pi])for(const x of spirits(q).filter(x=>x.sp.card.tier===1))await kill(x,eff(pi))}}};
SOVH[21]={1:{},2:{async mantraPlayed(ctx,s){if(ctx.pi===s.pi&&fire(ctx.card))await pickTemp(s.pi,'ลด DEF ศัตรู -400',foeSp(s.pi),'def',-400)}},
  3:{act:{label:'ร่าย Mantra ไฟจากสุสาน',can:c=>G.phase==='rite'&&!P(c.pi).tf.s21&&P(c.pi).disc.some(x=>x.type==='mantra'&&fire(x)&&P(c.pi).gems>=costOf(c.pi,x)&&H(x).main),
    async run(c){const p=P(c.pi),L=p.disc.filter(x=>x.type==='mantra'&&fire(x)&&p.gems>=costOf(c.pi,x)&&H(x).main);const k=await choose('เลือก Mantra จากสุสาน',cardList(L));if(k<0)return;
      const m=L[k];if(H(m).can&&!H(m).can({pi:c.pi,card:m}))return say('เงื่อนไขไม่ครบ');p.tf.s21=1;p.gems-=costOf(c.pi,m);p.disc.splice(p.disc.indexOf(m),1);p.out.push(m);
      const ctx={pi:c.pi,foe:1-c.pi,card:m,cancelled:false,cost:m.cost};await sealWindow(1-c.pi,'mantraPlayed',ctx);if(!ctx.cancelled)await H(m).main(ctx);p.tf.fireMantra=true}}}};
SOVH[22]={1:{shrineDestroyed(ctx,s){if(ctx.by&&ctx.by.pi===s.pi&&!P(s.pi).tf.s22){P(s.pi).tf.s22=1;gain(s.pi,1)}}},
  2:{aura:(s,tp,tsp)=>tp===s.pi&&tsp.how==='reinc'&&tsp.sumTurn===G.turnNo?{atk:400}:null},3:{async onAscend({pi}){await reincFromPool(pi,true,0)}}};
SOVH[23]={1:{aura:(s,tp,tsp)=>tp===s.pi&&tsp.card.tier===1?{atk:200}:null},2:{},
  3:{canDirectFor:(s,pi,sp)=>s.pi===pi&&fire(sp.card)&&P(1-pi).shrine.length<=2}};
SOVH[24]={1:{aura:(s,tp,tsp)=>tp===s.pi&&tsp.card.tribe==='สัตว์อสูรเพลิง'?{atk:200}:null},
  2:{dawn(ctx,s){if(ctx.pi===s.pi&&P(s.pi).pool.length>=4)draw(s.pi,1)}},3:{}};
SOVH[25]={1:{},2:{},3:{async onAscend({pi}){await breakShrine(pi,{burst:false});await breakShrine(1-pi,{burst:false});for(const x of spirits(pi))x.sp.temp.atk+=1000}}};
[59,75].forEach(n=>IMPLEMENTED.add(n));
// partial / not automated: 37, 62(sov dmg part ok), 76, 86, 93 stay flagged unless listed above
IMPLEMENTED.delete(86);
