// ===== Core engine + UI =====
const ELS=['Agni','Tamas','Nira','Vayu','Dharti','Jyoti'];
const NSLOT=6;
let G=null,UID=1;
const INST={},HND={},SOVH={};
const $=id=>document.getElementById(id);
const num=c=>+c.id.slice(4);
const ALT={44:['Tamas'],45:['Dharti'],46:['Vayu']};
const isEl=(c,e)=>c.el===e||(ALT[num(c)]||[]).includes(e);
const H=c=>HND[num(c)]||{};
const P=i=>G.ps[i],cur=()=>G.ps[G.t],opp=()=>G.ps[1-G.t];
const IMPLEMENTED=new Set();           // card numbers whose ability is automated (filled by agni.js)
const log=s=>G.log.push(s);
const say=m=>{G.msg=m};
const rnd=n=>Math.floor(Math.random()*n);
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
function inst(c){const o={...c,uid:UID++};INST[o.uid]=o;return o}
function pick(arr,n){return shuffle(arr.slice()).slice(0,n)}

// ---------- setup ----------
function mkP(el){
  const pool=CARDS.filter(c=>c.el===el),by=f=>pool.filter(f);
  const deck=[].concat(pick(by(c=>c.type==='spirit'&&c.tier===1),16),pick(by(c=>c.type==='spirit'&&c.tier===2),10),
    pick(by(c=>c.type==='spirit'&&c.tier===3),3),pick(by(c=>c.type==='mantra'),7),pick(by(c=>c.type==='sanct'),2),pick(by(c=>c.type==='seal'),2)).map(inst);
  shuffle(deck);
  const sov=inst(pick(by(c=>c.type==='sovereign'),1)[0]);
  return{el,deck,shrine:deck.splice(0,5),hand:deck.splice(0,5),field:Array(NSLOT).fill(null),pool:[],gems:0,sanct:null,seals:[],disc:[],out:[],
    sov:{card:sov,tier:1},tf:{},mdisc:0,turns:0};
}
function startGame(){
  G={ps:[mkP($('e0').value),mkP($('e1').value)],t:0,turnNo:0,phase:'rite',summoned:false,sel:null,msg:'',log:[],win:null,debug:$('dbg').checked,modal:null,pick:null,busy:false,warEnded:false};
  log('เริ่มเกม');act(async()=>{await mulligan();await dawn()});
}
function newSp(card,base,how){return{card,base,temp:{atk:0,def:0},bt:{atk:0,def:0},attacks:0,extra:0,hit:[],how,sumTurn:G.turnNo,locked:false,lockedAt:0,silenced:false,noDie:false,battled:false,tf:{},banish:false}}

// ---------- async UI primitives ----------
function choose(title,labels){
  if(G.auto)return Promise.resolve(G.auto(title,labels));
  return new Promise(res=>{G.modal={title,labels,res};render()});
}
async function ask(title){return (await choose(title,['ใช่','ไม่']))===0}
function pickSpirit(title,cands,allowSkip=true){
  if(!cands.length)return Promise.resolve(null);
  if(G.auto)return Promise.resolve(G.auto(title,cands,'pick'));
  if(cands.length===1&&!allowSkip)return Promise.resolve(cands[0]);
  return new Promise(res=>{G.pick={title,cands,res,allowSkip};render()});
}
function modalClick(i){const m=G.modal;G.modal=null;m.res(i);render()}
function skipPick(){const p=G.pick;G.pick=null;p.res(null);render()}
async function act(fn){
  if(G.busy)return;G.busy=true;
  try{await fn()}catch(e){console.error(e);say('ERROR: '+e.message);if(G.log)log('ERROR '+e.stack)}
  G.busy=false;G.modal=null;G.pick=null;if(G.win!==null&&G.win!==undefined)say('');render();
}

// ---------- helpers ----------
const gain=(pi,n)=>{P(pi).gems+=n;log('P'+(pi+1)+' ได้ '+n+' Gem')};
function draw(pi,n){const p=P(pi);let k=0;for(;k<n&&p.deck.length;k++)p.hand.push(p.deck.shift());if(k)log('P'+(pi+1)+' จั่ว '+k);return k}
const spirits=pi=>P(pi).field.map((sp,slot)=>sp?{pi,slot,sp}:null).filter(Boolean);
const fireSp=pi=>spirits(pi).filter(x=>isEl(x.sp.card,'Agni'));
const hasSpirit=pi=>P(pi).field.some(x=>x);
const sovNum=pi=>num(P(pi).sov.card);
const sovTier=pi=>P(pi).sov.tier;
const gemCap=pi=>5+((sovNum(pi)===25)?1:0);
function costOf(pi,c){
  let n=c.cost||0;
  if(c.type==='mantra'&&isEl(c,'Agni')){n-=P(pi).mdisc;if(sovNum(pi)===21&&!P(pi).tf.fireMantra)n-=1}
  if(c.discTurn===G.turnNo)n-=1;
  return Math.max(0,n);
}
// Reincarnate (a Tier 2/3 spirit from the Karma Pool back to the field) costs its RE; no base needed
function reincPay(pi,card,extra=0){
  let pay=Math.max(0,card.re-extra);
  if(pay>0&&isEl(card,'Agni')&&spirits(pi).some(x=>num(x.sp.card)===9&&!x.sp.silenced))pay=Math.max(1,pay-1);
  return pay;
}
// Normal summon of a Tier 2/3 spirit from hand: full cost, needs a base spirit on the field or in the Karma Pool (not consumed);
// a base of another element costs +1 Gem
function baseInfo(pi,card){
  const els=H(card).baseEls||[card.el],p=P(pi);
  const all=p.field.filter(Boolean).map(s=>s.card).concat(p.pool);
  const match=all.filter(b=>els.some(e=>isEl(b,e)));
  const free=card.tier===2&&all.some(b=>num(b)===31);
  return{all,match,extra:(match.length||free||!all.length)?0:1};
}

// event sources: spirits, sanctuary, sovereign tiers (acting player first)
function sources(){
  const out=[];
  for(const pi of [G.t,1-G.t]){const p=P(pi);
    p.field.forEach((sp,slot)=>{if(sp&&!sp.silenced)out.push({pi,sp,slot,h:H(sp.card)})});
    if(p.sanct)out.push({pi,sanct:p.sanct,h:H(p.sanct)});
    const sh=SOVH[num(p.sov.card)]||{};
    for(let t=1;t<=p.sov.tier;t++)if(sh[t])out.push({pi,sov:p.sov,t,h:sh[t]});
  }
  return out;
}
async function emit(ev,ctx){for(const s of sources()){const f=s.h[ev];if(f)await f(ctx,s)}}
function stat(pi,sp,k){
  let v=sp.card[k]+sp.temp[k]+sp.bt[k];
  const h=sp.silenced?{}:H(sp.card);
  if(h.passive){const r=h.passive({pi,sp});if(r&&r[k])v+=r[k]}
  for(const s of sources()){if(s.h.aura){const r=s.h.aura(s,pi,sp);if(r&&r[k])v+=r[k]}}
  if(P(pi).tf.oath&&isEl(sp.card,'Agni')&&k==='atk')v+=400;
  return Math.max(0,v);
}
const maxAtk=(pi,sp)=>{const h=sp.silenced?{}:H(sp.card);return(h.maxAttacks?h.maxAttacks({pi,sp}):1)+sp.extra};
const boostCap=pi=>3+((sovNum(pi)===25&&sovTier(pi)>=2)?1:0);
const boostVal=pi=>(sovNum(pi)===1&&sovTier(pi)>=3)?800:500;

// ---------- zones ----------
async function destroySp(pi,slot,cause={type:'effect'}){
  const p=P(pi),sp=p.field[slot];if(!sp)return false;
  if(sp.noDie&&cause.type==='combat'){log(sp.card.en+' ไม่ถูกทำลาย');return false}
  const h=sp.silenced?{}:H(sp.card);
  if(h.protect&&h.protect(cause,{pi,sp})){log(sp.card.en+' ไม่ถูกทำลายจากเอฟเฟกต์นี้');return false}
  p.field[slot]=null;
  if(sp.banish){p.out.push(sp.card)}else p.pool.push(sp.card);
  sp.base.forEach(b=>p.disc.push(b));
  log(sp.card.en+' (P'+(pi+1)+') ถูกทำลาย -> '+(sp.banish?'นอกเกม':'Karma Pool'));
  const ctx={pi,card:sp.card,sp,slot,cause,phase:G.phase};
  if(h.onDestroyed)await h.onDestroyed(ctx);
  await emit('spiritDestroyed',ctx);
  return true;
}
async function breakShrine(pi,{by=null,burst=true}={}){
  const p=P(pi);if(!p.shrine.length||G.win!==null)return;
  const c=p.shrine.shift();
  log('Shrine ของ P'+(pi+1)+' ถูกทำลาย: '+c.en+' (เหลือ '+p.shrine.length+')');
  if(burst&&c.burst){
    log('Karma Burst! '+c.en);
    const h=H(c);
    if(h.burst)await h.burst({pi,foe:1-pi,card:c,by});else log('(ผล Burst ของใบนี้ยังไม่ทำงาน)');
  }
  // what happens to the revealed card depends on its type (rulebook ch.9)
  if(c.type==='spirit'){p.pool.push(c);log(c.th+' ลง Karma Pool')}
  else if(c.type==='seal'||c.type==='sanct'){p.hand.push(c);log(c.th+' ขึ้นมือ')}
  else p.disc.push(c);
  await emit('shrineDestroyed',{pi,by,card:c});
}
async function sealWindow(defPi,trigger,ctx){
  const p=P(defPi);
  for(const seal of p.seals.slice()){
    const h=H(seal);if(h.trigger!==trigger)continue;
    if(p.gems<seal.act)continue;
    if(trigger==='myAttacked'&&ctx.d&&H(ctx.d.card).sealImmune)continue;
    if(ctx.a&&sealBlocked(ctx,seal))continue;
    if(h.cond&&!h.cond(ctx,defPi))continue;
    if(!(await ask('P'+(defPi+1)+': เปิด Seal "'+seal.th+'" ('+seal.act+' Gem)?\n'+seal.text)))continue;
    p.gems-=seal.act;p.seals.splice(p.seals.indexOf(seal),1);p.disc.push(seal);
    log('P'+(defPi+1)+' เปิด Seal: '+seal.en);
    await h.effect(ctx,defPi);
    if(ctx.cancelled)break;
  }
}
function sealBlocked(ctx,seal){
  const ap=ctx.pi,asp=ctx.a;
  if(num(asp.card)===59)return true;
  if(sovNum(ap)===24&&sovTier(ap)>=3&&asp.card.tribe==='สัตว์อสูรเพลิง'&&seal.act<=2)return true;
  return false;
}

// ---------- turn flow ----------
// Mulligan: once per game each player may put any cards of the opening hand back, reshuffle and draw the same number
async function mulligan(){
  for(const pi of [0,1]){
    G.t=pi;const p=P(pi),mark=new Set();
    for(let guard=0;guard<30;guard++){
      const labels=['✔ ยืนยัน'+(mark.size?' (เปลี่ยน '+mark.size+' ใบ)':' (ไม่เปลี่ยน)')].concat(p.hand.map((c,i)=>(mark.has(i)?'☑ ':'☐ ')+c.th));
      const k=await choose('P'+(pi+1)+' Mulligan (ทำได้ 1 ครั้งต่อเกม)\nเลือกการ์ดที่จะเปลี่ยน แล้วกดยืนยัน',labels);
      if(k<=0)break;mark.has(k-1)?mark.delete(k-1):mark.add(k-1);
    }
    if(mark.size){const back=[...mark].sort((a,b)=>b-a).map(i=>p.hand.splice(i,1)[0]);p.deck.push(...back);shuffle(p.deck);draw(pi,back.length);log('P'+(pi+1)+' Mulligan '+back.length+' ใบ')}
  }
  G.t=rnd(2);log('ผู้เล่นคนแรก (สุ่ม): P'+(G.t+1));
}
const firstTurn=()=>G.turnNo===1;
async function dawn(){
  G.turnNo++;const p=cur();
  G.ps.forEach(q=>{q.tf={};q.mdisc=0;q.field.forEach(s=>{if(s){s.attacks=0;s.extra=0;s.hit=[];s.battled=false;s.tf={}}})});
  G.phase='rite';G.summoned=false;G.warEnded=false;
  if(!firstTurn()){if(!p.deck.length){G.win=1-G.t;log('P'+(G.t+1)+' กองหมด แพ้');return}draw(G.t,1)}
  p.turns++;
  const n=Math.min(p.turns,5)+p.pool.length+(p.sanct&&num(p.sanct)===90?1:0);
  const g=Math.min(n,gemCap(G.t));p.gems+=g;
  log('--- เทิร์น P'+(G.t+1)+' Dawn: '+(firstTurn()?'ผู้เล่นคนแรกไม่จั่ว':'จั่ว 1')+', +'+g+' Gem (รวม '+p.gems+')');
  await emit('dawn',{pi:G.t});
}
async function nextPhase(){
  if(G.win!==null)return;G.sel=null;say('');
  if(G.phase==='rite'){G.phase='war';return}
  if(G.phase==='war'){
    const must=spirits(G.t).find(x=>{const h=H(x.sp.card);const lt=legalTargets(G.t,x.sp);return h.mustAttack&&!x.sp.silenced&&!x.sp.locked&&x.sp.attacks===0&&!G.warEnded&&!firstTurn()&&(lt.spirits.length||lt.direct)});
    if(must)return say(must.sp.card.th+' ต้องโจมตีก่อนจบ War');
    G.phase='dusk';await duskStart();return;
  }
  if(cur().hand.length>7){G.sel={kind:'discard'};return say('ต้องทิ้งจนเหลือ 7 (คลิกการ์ดในมือ)')}
  // end of turn cleanup
  G.ps.forEach((q,qi)=>q.field.forEach((s,i)=>{if(s){s.temp={atk:0,def:0};s.bt={atk:0,def:0};s.silenced=false;s.noDie=false;
    if(s.locked&&qi===G.t&&G.turnNo>s.lockedAt)s.locked=false}}));
  for(const x of spirits(G.t).concat(spirits(1-G.t))){if(x.sp.banish&&P(x.pi).field[x.slot]===x.sp){P(x.pi).field[x.slot]=null;P(x.pi).out.push(x.sp.card);log(x.sp.card.en+' ออกนอกเกม')}}
  G.t=1-G.t;await dawn();
}
async function duskStart(){
  for(const s of sources()){if(s.h.onDusk&&s.pi===G.t)await s.h.onDusk({pi:G.t},s)}
  if(cur().hand.length>7){G.sel={kind:'discard'};say('ทิ้งการ์ดจนเหลือ 7 (คลิกการ์ดในมือ)')}
}

// ---------- playing cards ----------
async function ascend(pi){
  const s=P(pi).sov;if(s.tier>=3)return;
  s.tier++;log('Sovereign P'+(pi+1)+' Ascend -> T'+s.tier);
  const hh=(SOVH[num(s.card)]||{})[s.tier];if(hh&&hh.onAscend)await hh.onAscend({pi},{pi,sov:s,t:s.tier});
}
async function onAscendClick(){
  const p=cur(),s=p.sov;if(G.phase!=='rite'||s.tier>=3)return;
  if(firstTurn())return say('ผู้เล่นคนแรก Ascend ไม่ได้ในเทิร์นแรก');
  const cost=s.card.asc[s.tier-1];if(p.gems<cost)return say('Gem ไม่พอ ต้อง '+cost);
  p.gems-=cost;await ascend(G.t);
}
async function afterSummon(pi,slot,how){
  const sp=P(pi).field[slot];log('P'+(pi+1)+' ลง '+sp.card.en+(how==='reinc'?' (Reincarnate)':''));
  const h=H(sp.card);const ctx={pi,sp,slot,how};
  if(h.onSummon)await h.onSummon(ctx,{pi,sp,slot});
  await emit('summoned',{pi,sp,slot,how,tier:sp.card.tier});
}
async function summonFree(pi,card,from){ // tier-1 style summon
  const p=P(pi),slot=p.field.indexOf(null);if(slot<0){say('สนามเต็ม');return false}
  const src=from==='pool'?p.pool:p.hand;src.splice(src.indexOf(card),1);
  p.field[slot]=newSp(card,[],'free');await afterSummon(pi,slot,'free');return true;
}
async function summonNormal(pi,card,{base,pay}){
  const p=P(pi),slot=p.field.indexOf(null);if(slot<0){say('สนามเต็ม');return false}
  p.gems-=pay;p.hand.splice(p.hand.indexOf(card),1);
  p.field[slot]=newSp(card,[],'normal');p.field[slot].baseRef=base;
  if(pay)log('อัญเชิญจ่าย '+pay+' Gem');
  const bh=H(base);if(bh.onBaseUsed)await bh.onBaseUsed({pi,target:card,base});
  await afterSummon(pi,slot,'normal');return true;
}
// Reincarnate: bring a spirit from the Karma Pool (or, for card effects, the hand) onto the field, paying `pay`
async function summonReinc(pi,card,{from='hand',pay=0}={}){
  const p=P(pi),slot=p.field.indexOf(null);if(slot<0){say('สนามเต็ม');return false}
  if(p.gems<pay){say('Gem ไม่พอ');return false}
  const src=from==='pool'?p.pool:p.hand;src.splice(src.indexOf(card),1);
  p.gems-=pay;p.field[slot]=newSp(card,[],'reinc');
  if(pay)log('Reincarnate จ่าย '+pay+' Gem');
  await afterSummon(pi,slot,'reinc');
  await emit('reincSummoned',{pi,sp:p.field[slot]});
  return true;
}
async function playSpirit(i){
  const p=cur(),c=p.hand[i],h=H(c);
  if(p.field.indexOf(null)<0)return say('สนามเต็ม');
  if(h.canSummon&&!h.canSummon(G.t))return say('เงื่อนไขการเรียกไม่ครบ');
  if(c.tier===1){
    if(G.summoned)return say('Tier 1 ลงได้ 1 ใบ/เทิร์น');
    G.summoned=true;return summonFree(G.t,c,'hand');
  }
  const info=baseInfo(G.t,c);
  if(!info.all.length)return say('ต้องมี Spirit ในสนามหรือ Karma Pool เป็นฐาน');
  const pay=c.cost+info.extra;if(p.gems<pay)return say('Gem ไม่พอ ต้องจ่าย '+pay+(info.extra?' (รวมค่าข้ามธาตุ 1)':''));
  const cands=info.match.length?info.match:info.all;let base=cands[0];
  if(cands.length>1){const k=await choose('เลือก Spirit ที่เป็นฐาน (ไม่ถูกใช้ไป)',cands.map(b=>b.th+' ('+b.en+')'));if(k<0)return;base=cands[k]}
  await summonNormal(G.t,c,{base,pay});
}
async function playMantra(i){
  const p=cur(),c=p.hand[i],h=H(c);
  if(h.can&&!h.can({pi:G.t,card:c}))return say('เงื่อนไขของ Mantra ไม่ครบ');
  const cost=costOf(G.t,c);if(p.gems<cost)return say('Gem ไม่พอ ต้อง '+cost);
  p.gems-=cost;p.hand.splice(i,1);log('P'+(G.t+1)+' ใช้ Mantra: '+c.en);
  const fire=isEl(c,'Agni');
  const ctx={pi:G.t,foe:1-G.t,card:c,cancelled:false,cost:c.cost};
  await sealWindow(1-G.t,'mantraPlayed',ctx);
  if(ctx.cancelled){p.disc.push(c);return}
  if(fire){p.mdisc=0}
  if(h.main)await h.main(ctx);else log('(ผลของ Mantra ใบนี้ยังไม่ทำงาน — ใช้ปุ่ม manual): '+c.text);
  if(fire)p.tf.fireMantra=true;
  p.disc.push(c);
  await emit('mantraPlayed',{pi:G.t,card:c});
}
async function onHand(i){
  if(G.win!==null)return;const p=cur(),c=p.hand[i];
  if(G.sel&&G.sel.kind==='discard'){p.hand.splice(i,1);p.disc.push(c);if(p.hand.length<=7){G.sel=null;say('')}return}
  G.sel=null;say('');
  if(G.phase!=='rite')return say('เล่นการ์ดได้เฉพาะช่วง Rite');
  if(c.type==='spirit')return playSpirit(i);
  if(c.type==='mantra')return playMantra(i);
  if(c.type==='seal'){if(p.seals.length>=3)return say('Seal Zone เต็ม (3 ใบ)');p.hand.splice(i,1);p.seals.push(c);return log('P'+(G.t+1)+' วาง Seal คว่ำ')}
  if(c.type==='sanct'){
    const cost=costOf(G.t,c);if(p.gems<cost)return say('Gem ไม่พอ ต้อง '+cost);
    p.gems-=cost;p.hand.splice(i,1);if(p.sanct)p.disc.push(p.sanct);p.sanct=c;
    log('P'+(G.t+1)+' วาง Sanctuary: '+c.en);
  }
}
// What a card in the Karma Pool can do now: Reincarnate (Tier 2/3) and/or its own pool ability
function poolOptions(pi,card){
  const o=[];if(pi!==G.t||G.phase!=='rite'||G.win!==null)return o;
  const h=H(card);
  if(card.type==='spirit'&&card.tier>=2&&P(pi).field.indexOf(null)>=0&&P(pi).gems>=reincPay(pi,card)&&!(h.canSummon&&!h.canSummon(pi)))
    o.push({label:'Reincarnate ('+reincPay(pi,card)+' Gem)',run:()=>summonReinc(pi,card,{from:'pool',pay:reincPay(pi,card)})});
  if(h.poolAct&&h.poolAct.can({pi,card}))o.push({label:h.poolAct.label,run:()=>h.poolAct.run({pi,card})});
  return o;
}
async function onPoolAct(pi,j){
  const c=P(pi).pool[j];if(!c)return;const o=poolOptions(pi,c);if(!o.length)return;
  let k=0;if(o.length>1){k=await choose(c.th,o.map(x=>x.label));if(k<0)return}
  await o[k].run();
}
async function onSpiritAct(pi,slot){
  const sp=P(pi).field[slot];if(!sp||pi!==G.t)return;const h=sp.silenced||sp.locked?{}:H(sp.card);
  if(h.act&&h.act.can({pi,sp,slot}))await h.act.run({pi,sp,slot});
}
async function onSovAct(k){
  const sh=(SOVH[sovNum(G.t)]||{})[k];if(sh&&sh.act&&sh.act.can({pi:G.t}))await sh.act.run({pi:G.t});
}

// ---------- combat ----------
function legalTargets(pi,sp){
  const fp=1-pi,fs=spirits(fp).filter(x=>!(H(sp.card).maxAttacks&&sp.hit.includes(x.sp.card.uid)));
  const h=sp.silenced?{}:H(sp.card);
  let direct=!hasSpirit(fp);
  if(h.canDirect&&h.canDirect({pi,sp}))direct=true;
  for(const s of sources())if(s.pi===pi&&s.h.canDirectFor&&s.h.canDirectFor(s,pi,sp))direct=true;
  if(P(fp).tf.shrineLock)direct=false;
  return{spirits:H(sp.card).onlyDirect?[]:fs,direct};
}
// Sovereign fights through a stand-in spirit: it has no element or tribe, so spirit auras skip it, and it cannot be destroyed
function sovFighter(pi){const s=P(pi).sov;return newSp({...s.card,atk:s.card.hp[s.tier-1],def:0,el:'',tribe:'',tier:0},[],'sov')}
const fighter=(pi,slot)=>slot==='sov'?sovFighter(pi):P(pi).field[slot];
const onBoard=(pi,slot,sp)=>slot==='sov'||P(pi).field[slot]===sp;
const canSovAttack=pi=>!firstTurn()&&G.phase==='war'&&pi===G.t&&!G.warEnded&&!P(pi).tf.sovAtk&&P(pi).gems>=1&&G.win===null;
function selectSov(){
  if(!canSovAttack(G.t))return say('Sovereign โจมตีได้ตาละ 1 ครั้ง ใช้ 1 Gem ในช่วง War');
  G.sel={kind:'atk',slot:'sov'};say('เลือกเป้าหมายของ Sovereign (จ่าย 1 Gem ตอนเลือกเป้า)');
}
const canAttack=(pi,sp)=>!firstTurn()&&G.phase==='war'&&pi===G.t&&!G.warEnded&&!sp.locked&&sp.attacks<maxAtk(pi,sp);
async function onField(pi,slot){
  if(G.win!==null)return;const sp=P(pi).field[slot];if(!sp)return;const sel=G.sel;
  if(sel&&sel.kind==='manualKill'){G.sel=null;say('');log('(manual) ทำลาย '+sp.card.en);return destroySp(pi,slot,{type:'effect'})}
  if(sel&&sel.kind==='atk'&&pi!==G.t){
    const a=fighter(G.t,sel.slot),lt=legalTargets(G.t,a);
    if(!lt.spirits.some(x=>x.slot===slot))return say('โจมตีเป้านี้ไม่ได้');
    G.sel=null;say('');return doAttack(G.t,sel.slot,{kind:'sp',slot});
  }
  if(pi===G.t&&G.phase==='war'){
    if(sp.locked)return say('Spirit นี้ติดสถานะ [ล็อค] โจมตีไม่ได้');
    if(!canAttack(pi,sp))return say('Spirit นี้โจมตีไม่ได้แล้วในเทิร์นนี้');
    G.sel={kind:'atk',slot};say('เลือกเป้าหมาย (กรอบเขียว) หรือกดปุ่มโจมตี Shrine');
  }
}
async function atkShrine(){
  if(!G.sel||G.sel.kind!=='atk')return;
  const a=fighter(G.t,G.sel.slot),lt=legalTargets(G.t,a);
  if(!lt.direct)return say('ตอนนี้โจมตี Sovereign/Shrine โดยตรงไม่ได้ ต้องโจมตี Spirit ก่อน');
  const slot=G.sel.slot;G.sel=null;say('');await doAttack(G.t,slot,{kind:'direct'});
}
async function boostPrompt(pi,label){
  const p=P(pi),cap=Math.min(boostCap(pi),p.gems);if(cap<=0)return 0;
  const labels=['ไม่จ่าย'];for(let k=1;k<=cap;k++)labels.push('จ่าย '+k+' Gem (+'+k*boostVal(pi)+')');
  const k=await choose('P'+(pi+1)+' Karma Boost ('+label+')',labels);
  const n=Math.max(0,k);p.gems-=n;if(n)log('P'+(pi+1)+' จ่าย Karma Boost '+n+' Gem');return n;
}
async function doAttack(pi,slot,t){
  const fp=1-pi,a=fighter(pi,slot);if(!a)return;
  if(slot==='sov'){P(pi).gems--;P(pi).tf.sovAtk=1}
  const ctx={pi,fp,a,slot,t,cancelled:false,boostA:0,boostD:0,d:t.kind==='sp'?P(fp).field[t.slot]:null,fs:false};
  a.attacks++;a.battled=true;if(ctx.d)a.hit.push(ctx.d.card.uid);
  log('P'+(pi+1)+' '+a.card.en+' โจมตี '+(ctx.d?ctx.d.card.en:'Sovereign/Shrine'));
  const ah=a.silenced?{}:H(a.card);
  if(ah.onAttack)await ah.onAttack(ctx,{pi,sp:a,slot});
  if(ctx.d){const dh=ctx.d.silenced?{}:H(ctx.d.card);if(dh.onDefend)await dh.onDefend(ctx,{pi:fp,sp:ctx.d,slot:t.slot})}
  if(ctx.d)for(const [x,o] of [[a,ctx.d],[ctx.d,a]]){const hh=x.silenced?{}:H(x.card);if(hh.onBattleWith)hh.onBattleWith(o,x)}
  await emit('attackDeclared',ctx);
  await sealWindow(fp,'oppAttack',ctx);
  if(!ctx.cancelled&&ctx.d)await sealWindow(fp,'myAttacked',ctx);
  if(!ctx.cancelled&&!ctx.d)await sealWindow(fp,'shrineDirect',ctx);
  if(!onBoard(pi,slot,a)){cleanBattle(a,ctx.d);return}
  if(ctx.cancelled){cleanBattle(a,ctx.d);return}
  if(!ctx.d){
    if(P(fp).tf.shrineLock){log('Shrine ถูกป้องกัน');cleanBattle(a);return}
    if(!P(fp).shrine.length){G.win=pi;log('ตี Sovereign ของ P'+(fp+1)+' สำเร็จ หลัง Shrine หมด — P'+(pi+1)+' ชนะ!');cleanBattle(a);return}
    await breakShrine(fp,{by:slot==='sov'?null:{pi,sp:a}});
    const hh=a.silenced?{}:H(a.card);if(hh.onShrineHit)await hh.onShrineHit(ctx,{pi,sp:a,slot});
    await sealWindow(fp,'shrineBroken',ctx);
    cleanBattle(a);return;
  }
  const d=ctx.d;
  ctx.boostA=await boostPrompt(pi,'ฝ่ายโจมตี '+a.card.th);
  a.bt.atk+=ctx.boostA*boostVal(pi);if(ah.onBoost&&ctx.boostA)ah.onBoost(ctx,a,ctx.boostA);
  ctx.boostD=await boostPrompt(fp,'ฝ่ายป้องกัน '+d.card.th);
  d.bt.def+=ctx.boostD*boostVal(fp);
  const dh2=d.silenced?{}:H(d.card);if(dh2.onBoost&&ctx.boostD)dh2.onBoost(ctx,d,ctx.boostD);
  ctx.fs=!!(ah.firstStrike&&ah.firstStrike(ctx,{pi,sp:a}));
  const A=stat(pi,a,'atk'),D=stat(fp,d,'def');
  log('ATK '+A+' vs DEF '+D+(ctx.fs?' (โจมตีก่อน)':''));
  const byA={type:'combat',by:{pi,sp:a}},byD={type:'combat',by:{pi:fp,sp:d}};
  let killedD=false;
  if(A>D){killedD=await destroySp(fp,t.slot,byA)}
  else if(A<D){if(slot==='sov')log('Sovereign ไม่ถูกทำลาย');else await destroySp(pi,slot,byD)}
  else if(ctx.fs){killedD=await destroySp(fp,t.slot,byA)}
  else{
    let saveA=false,saveD=false;
    if(slot!=='sov'&&sovNum(pi)===23&&sovTier(pi)>=2&&P(pi).gems>=1&&await ask('P'+(pi+1)+': จ่าย 1 Gem ให้ Spirit ไม่ถูกทำลายจาก Double KO?')){P(pi).gems--;saveA=true}
    if(sovNum(fp)===23&&sovTier(fp)>=2&&P(fp).gems>=1&&await ask('P'+(fp+1)+': จ่าย 1 Gem ให้ Spirit ไม่ถูกทำลายจาก Double KO?')){P(fp).gems--;saveD=true}
    byA.doubleKO=byD.doubleKO=true;
    if(!saveD)killedD=await destroySp(fp,t.slot,byA);
    if(!saveA)await destroySp(pi,slot,byD);
  }
  if(killedD&&onBoard(pi,slot,a)){
    if(P(pi).tf.oath&&(P(pi).tf.oathDraws||0)<2){P(pi).tf.oathDraws=(P(pi).tf.oathDraws||0)+1;draw(pi,1)}
    if(ah.onWin)await ah.onWin(ctx,{pi,sp:a,slot});
    await emit('wonBattle',{...ctx,winnerPi:pi});
  }
  for(const [x,xp,sl] of [[a,pi,slot],[d,fp,t.slot]]){
    if(onBoard(xp,sl,x)){const hh=x.silenced?{}:H(x.card);if(hh.afterBattle)await hh.afterBattle(ctx,{pi:xp,sp:x,slot:sl})}
  }
  cleanBattle(a,d);
}
function cleanBattle(...sps){sps.forEach(s=>{if(s)s.bt={atk:0,def:0}})}

// ---------- manual tools ----------
function manual(k){
  const p=cur();
  if(k==='g+')p.gems++;else if(k==='g-'&&p.gems>0)p.gems--;else if(k==='draw')draw(G.t,1);
  else if(k==='kill'){G.sel={kind:'manualKill'};say('คลิก Spirit ที่จะทำลาย')}
}

// ---------- rendering ----------
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
function status(c){
  if(c.el!=='Agni')return '<span class="warn">⚠ ธาตุนี้ยังไม่ทำความสามารถ</span>';
  const n=num(c);if(c.type==='sovereign'||IMPLEMENTED.has(n))return '<span class="ok">✓ ทำงานอัตโนมัติ</span>';
  return '<span class="warn">⚠ ความสามารถยังไม่ทำงาน (ผลสถิติปกติ)</span>';
}
function show(uid){
  const c=INST[uid];if(!c)return;let st='';
  if(c.type==='spirit')st=`Tier ${c.tier} | ค่าร่าย ${c.cost}${c.re?' (RE '+c.re+')':''} | ATK ${c.atk} / DEF ${c.def}`;
  else if(c.type==='sovereign')st=`ATK ${c.hp.join('/')} | Ascend ${c.asc.join('/')} Gem | โจมตีได้ตาละ 1 ครั้ง (1 Gem)`;
  else if(c.type==='seal')st='วางฟรี | เปิดใช้ '+c.act+' Gem';else st='ค่าร่าย '+c.cost;
  $('detail').innerHTML=`<b>${esc(c.th)}</b><br>${esc(c.en)}<br>${c.id} [${c.rar}] ${c.el} / ${c.type}${c.tribe&&c.type==='spirit'?' / '+esc(c.tribe):''}<br>${st}<br>${status(c)}<hr>${esc(c.text)}`;
}
function playable(c){
  if(G.phase!=='rite'||G.win!==null)return false;const p=cur();
  if(c.type==='spirit'){if(p.field.indexOf(null)<0)return false;const h=H(c);if(h.canSummon&&!h.canSummon(G.t))return false;
    if(c.tier===1)return !G.summoned;const bi=baseInfo(G.t,c);return bi.all.length>0&&p.gems>=c.cost+bi.extra}
  if(c.type==='mantra'){const h=H(c);return p.gems>=costOf(G.t,c)&&!(h.can&&!h.can({pi:G.t,card:c}))}
  if(c.type==='seal')return p.seals.length<3;
  return p.gems>=costOf(G.t,c);
}
function hint(){
  if(G.win!==null)return 'เกมจบแล้ว กด Start เพื่อเริ่มใหม่';
  const who='P'+(G.t+1);
  if(G.phase==='rite')return `${who} · RITE: คลิกการ์ดในมือที่ขอบเขียวเพื่อเล่น (Spirit T1 ลงฟรี 1 ใบ/เทิร์น · T2-T3 ต้องมี Spirit เป็นฐานในสนามหรือ Pool แล้วจ่ายค่าร่ายเต็ม · ชี้ที่ Karma Pool เพื่อ Reincarnate (จ่าย RE) · Mantra/Sanctuary จ่าย Gem · Seal วางคว่ำฟรี) · Ascend Sovereign ได้ที่การ์ด Sovereign · เสร็จแล้วกด "ไป War"`;
  if(G.phase==='war'&&firstTurn())return `${who} · WAR: เทิร์นแรกของเกม ผู้เล่นคนแรกโจมตีไม่ได้ กด "ไป Dusk"`;
  if(G.phase==='war')return `${who} · WAR: คลิก Spirit ของคุณที่จะโจมตี → เลือกเป้า (กรอบเขียว) หรือกดปุ่มโจมตี Sovereign (ทำได้เมื่อศัตรูไม่มี Spirit) · Sovereign ของคุณโจมตีได้ตาละ 1 ครั้ง ใช้ 1 Gem · ชนะเมื่อทำลาย Shrine ครบ 5 ใบแล้วตี Sovereign อีก 1 ครั้ง · เสร็จแล้วกด "ไป Dusk"`;
  return `${who} · DUSK: ทิ้งไพ่ให้เหลือ 7 ใบ (ถ้าเกิน) แล้วกด "จบเทิร์น"`;
}
function render(){} // replaced by ui.js
async function manualSeal(k){
  const p=cur(),c=p.seals[k];if(p.gems<c.act)return say('Gem ไม่พอ ต้อง '+c.act);
  p.gems-=c.act;p.seals.splice(k,1);p.disc.push(c);log('P'+(G.t+1)+' เปิด Seal: '+c.en+' — '+c.text+' (ผลต้องจัดการเอง)');
}
function spClick(pi,slot){
  if(G.pick){const c=G.pick.cands.find(x=>x.pi===pi&&x.slot===slot);if(c){const p=G.pick;G.pick=null;p.res(c);render()}return}
  act(()=>onField(pi,slot));
}
ELS.forEach(e=>{$('e0').add(new Option(e,e));$('e1').add(new Option(e,e))});$('e0').value='Agni';$('e1').value='Agni';
