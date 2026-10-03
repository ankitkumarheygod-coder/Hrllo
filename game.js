'use strict';
/* MIND BLOCKS — original procedural block puzzle. Vanilla JS. */
const N=8,SAVE='mindblocks.v1',GAME_SEED='MB-ORIGIN-1';
const $=s=>typeof document!=='undefined'?document.querySelector(s):null;

/* ---------- deterministic PRNG: hash(string) -> seed, mulberry32 ---------- */
function hash(str){str=String(str);let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19}h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);return(h^h>>>16)>>>0}
function rng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* ---------- shapes: base + complexity (1..5); all rotations/mirrors generated ---------- */
const BASES=[['dot',1,[[0,0]]],['d2',1,[[0,0],[0,1]]],['l3',1,[[0,0],[0,1],[0,2]]],['c3',1,[[0,0],[1,0],[1,1]]],
['sq',2,[[0,0],[0,1],[1,0],[1,1]]],['l4',2,[[0,0],[0,1],[0,2],[0,3]]],['L',3,[[0,0],[1,0],[2,0],[2,1]]],['T',3,[[0,0],[0,1],[0,2],[1,1]]],
['Z',3,[[0,0],[0,1],[1,1],[1,2]]],['P',4,[[0,0],[0,1],[1,0],[1,1],[2,0]]],['U',4,[[0,0],[0,2],[1,0],[1,1],[1,2]]],
['r23',4,[[0,0],[0,1],[0,2],[1,0],[1,1],[1,2]]],['bigL',4,[[0,0],[1,0],[2,0],[2,1],[2,2]]],['plus',4,[[0,1],[1,0],[1,1],[1,2],[2,1]]],
['l5',4,[[0,0],[0,1],[0,2],[0,3],[0,4]]],['sq3',5,[[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]]],['W',5,[[0,0],[1,0],[1,1],[2,1],[2,2]]]];
function norm(m){const r=Math.min(...m.map(p=>p[0])),c=Math.min(...m.map(p=>p[1]));return m.map(p=>[p[0]-r,p[1]-c]).sort((a,b)=>a[0]-b[0]||a[1]-b[1])}
const BY={};
BASES.forEach(([id,cx,m])=>{const seen=new Set(),list=BY[id]=[];let cur=m;for(let f=0;f<2;f++){for(let r=0;r<4;r++){cur=norm(cur.map(([a,b])=>[b,-a]));const k=JSON.stringify(cur);if(!seen.has(k)){seen.add(k);list.push({id:id+list.length,base:id,cx,cells:cur})}}cur=cur.map(([a,b])=>[a,-b])}});
const colorOf=b=>1+hash(b)%6;

/* ---------- board primitives ---------- */
const inb=(r,c)=>r>=0&&c>=0&&r<N&&c<N;
function canPlacePiece(b,cells,r,c){for(const[a,d]of cells){const y=r+a,x=c+d;if(!inb(y,x)||b[y*N+x])return false}return true}
function findPossibleMoves(b,cells,cap=1e9){const o=[];for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(canPlacePiece(b,cells,r,c)){o.push([r,c]);if(o.length>=cap)return o}return o}
function hasAnyLegalMove(b,ps){return ps.some(p=>p&&findPossibleMoves(b,p.cells,1).length)}
/* find & clear every full row/column (mutates b) */
function clearLines(b){const idx=new Set();let lines=0;for(let i=0;i<N;i++){let rf=1,cf=1;for(let j=0;j<N;j++){if(!b[i*N+j])rf=0;if(!b[j*N+i])cf=0}
 if(rf){lines++;for(let j=0;j<N;j++)idx.add(i*N+j)}if(cf){lines++;for(let j=0;j<N;j++)idx.add(j*N+i)}}idx.forEach(i=>b[i]=0);return{lines,idx}}
function applyMove(b,cells,r,c,color){const nb=b.slice();for(const[a,d]of cells)nb[(r+a)*N+c+d]=color;const s=clearLines(nb);return{board:nb,lines:s.lines,idx:s.idx}}
function calculateScore(blocks,lines,combo){const LB=[0,100,260,480,760];const lb=lines<=4?LB[lines]:760+(lines-4)*320;return blocks*10+lb*Math.max(1,combo)}

/* ---------- difficulty ---------- */
function calculateDifficulty(level,r){return Math.min(1,Math.max(0,(1-Math.exp(-level/320))*.82+(r?r()*.14:.07)))}
function estimateDifficulty(b,ps){const dens=b.filter(Boolean).length/64,cx=ps.reduce((s,p)=>s+p.cx,0)/ps.length/5,mv=ps.reduce((s,p)=>s+findPossibleMoves(b,p.cells).length,0);
 return Math.min(1,Math.max(0,.4*dens/.5+.3*cx+.3*(1-Math.min(1,mv/150))))}
const TIERS=[[.1,'Easy'],[.22,'Easy+'],[.38,'Medium'],[.52,'Hard'],[.66,'Very Hard'],[.78,'Expert'],[9,'Master']];
const tierName=(d,n)=>n<=20?'Tutorial':TIERS.find(t=>d<t[0])[1];

/* ---------- piece generation ---------- */
function pickShape(r,target){let tot=0;const w=BASES.map(([id,cx])=>{const x=Math.exp(-Math.abs(cx-target)*.9)+(cx==1?.12:0);tot+=x;return x});
 let t=r()*tot,k=0;while(k<w.length-1&&(t-=w[k])>0)k++;const l=BY[BASES[k][0]],s=l[Math.floor(r()*l.length)];
 return{id:s.id,base:s.base,cx:s.cx,cells:s.cells,color:colorOf(s.base),w:Math.max(...s.cells.map(c=>c[1]))+1,h:Math.max(...s.cells.map(c=>c[0]))+1}}
/* can ALL pieces be placed in some order (line clears simulated)? node-capped DFS */
function solvable(b,ps,bud){if(!ps.length)return true;for(let i=0;i<ps.length;i++){const p=ps[i],rest=ps.filter((_,j)=>j!==i);
 for(const[r,c]of findPossibleMoves(b,p.cells)){if(--bud.n<0)return true;if(solvable(applyMove(b,p.cells,r,c,p.color).board,rest,bud))return true}}return false}
/* choose a fair trio: solvable, not recently repeated, legal-move count close to the target "decision pressure" */
function generatePieces(b,r,d,recent){const target=1+d*3.1,want=170*(1-.6*d);let best=null,bs=1e9;
 for(let t=0;t<24;t++){const ps=[0,1,2].map(()=>pickShape(r,target)),key=ps.map(p=>p.base).sort().join();
  if(recent.includes(key)&&t<18)continue;if(!hasAnyLegalMove(b,ps)||!solvable(b,ps,{n:2500}))continue;
  const mv=ps.reduce((s,p)=>s+findPossibleMoves(b,p.cells).length,0),sc=Math.abs(mv-want);if(sc<bs){bs=sc;best={pieces:ps,key}}}
 if(!best){const ps=['dot','d2','c3'].map(id=>{const s=BY[id][0];return{id:s.id,base:id,cx:1,cells:s.cells,color:colorOf(id),w:Math.max(...s.cells.map(c=>c[1]))+1,h:Math.max(...s.cells.map(c=>c[0]))+1}});best={pieces:ps,key:'fallback'}}
 return best}

/* ---------- level generation ---------- */
function generateBoard(r,d){const b=Array(64).fill(0),k=Math.round((.06+.26*d)*64),type=Math.floor(r()*3),col=()=>1+Math.floor(r()*6),cnt=()=>b.filter(Boolean).length;
 if(type==0){while(cnt()<k)b[Math.floor(r()*64)]=col()}
 else if(type==1){let g=0;while(cnt()<k&&g++<20){const row=r()<.5,i=Math.floor(r()*N),gap=Math.floor(r()*N),gap2=r()<.4?Math.floor(r()*N):-1;
  for(let j=0;j<N;j++)if(j!=gap&&j!=gap2)b[row?i*N+j:j*N+i]=col()}}
 else{while(cnt()<k){const y=Math.floor(r()*N),x=Math.floor(r()*N),s=1+Math.floor(r()*3);for(let a=0;a<s;a++)for(let c=0;c<s;c++)if(inb(y+a,x+c))b[(y+a)*N+x+c]=col()}}
 let s;const t=b.slice();while((s=clearLines(t)).lines){/* break any pre-filled line */ }
 // clearLines on a copy only tells us lines exist; remove a cell from each until none are full
 const out=b.slice();for(let g=0;g<64;g++){const probe=out.slice(),sc=clearLines(probe);if(!sc.lines)break;out[[...sc.idx][0]]=0}return out}
function makeObjective(n,d,r){const type=['score','lines','place'][(n-1)%3];
 if(type=='score')return{type,target:Math.round((300+120*Math.sqrt(Math.min(n,400))+d*500)/50)*50};
 if(type=='lines')return{type,target:4+Math.floor(d*7+Math.log2(n+1))};
 return{type,target:12+Math.floor(d*18)}}
function validateLevel(b,ps){return ps.length==3&&clearLines(b.slice()).lines==0&&hasAnyLegalMove(b,ps)&&solvable(b,ps,{n:4000})}
function generateLevel(n){for(let a=0;a<40;a++){const r=rng(hash(`${GAME_SEED}:L${n}:${a}`)),d=calculateDifficulty(n,r),board=generateBoard(r,d*(1-a*.02));
  const g=generatePieces(board,rng(hash(`${GAME_SEED}:P${n}:0:${a}`)),d,[]);
  if(validateLevel(board,g.pieces))return{n,d,attempt:a,board,obj:makeObjective(n,d,r)}}
 return{n,d:0,attempt:0,board:Array(64).fill(0),obj:makeObjective(n,0,rng(1))}}

/* ---------- hints: best-looking legal move (lines, contact, few holes) ---------- */
function generateHint(b,ps){let best=null,bs=-1e9;ps.forEach((p,pi)=>{if(!p)return;for(const[r,c]of findPossibleMoves(b,p.cells)){
 const res=applyMove(b,p.cells,r,c,p.color);let contact=0,holes=0;
 for(const[a,d]of p.cells)for(const[dy,dx]of[[1,0],[-1,0],[0,1],[0,-1]]){const y=r+a+dy,x=c+d+dx;if(!inb(y,x)||b[y*N+x])contact++}
 for(let i=0;i<64;i++)if(!res.board[i]){const y=i>>3,x=i&7;if([[1,0],[-1,0],[0,1],[0,-1]].every(([dy,dx])=>!inb(y+dy,x+dx)||res.board[(y+dy)*N+x+dx]))holes++}
 const s=res.lines*60+contact*3-holes*14+p.cells.length;if(s>bs){bs=s;best={pi,r,c}}}});return best}

if(typeof module!=='undefined')module.exports={hash,rng,generateLevel,generatePieces,generateHint,applyMove,hasAnyLegalMove,canPlacePiece,findPossibleMoves,validateLevel,calculateScore,calculateDifficulty,estimateDifficulty,solvable,GAME_SEED};

/* =====================  UI / GAME FLOW (browser only)  ===================== */
if(typeof document!=='undefined'){
const defaults=()=>({level:1,highest:1,best:0,total:0,stars:{},ach:{},stats:{games:0,lines:0,maxCombo:0,blocks:0,hints:0,completed:0,perfect:0},
 set:{sound:true,vib:true,dark:matchMedia('(prefers-color-scheme:dark)').matches,reduce:matchMedia('(prefers-reduced-motion:reduce)').matches}});
function merge(a,b){if(!b)return a;for(const k in a){if(k=='stars'||k=='ach')a[k]=b[k]||{};else if(a[k]&&typeof a[k]=='object')a[k]=merge(a[k],b[k]);else if(b[k]!==undefined)a[k]=b[k]}return a}
function loadProgress(){try{return merge(defaults(),JSON.parse(localStorage.getItem(SAVE)))}catch(e){return defaults()}}
function saveProgress(){try{localStorage.setItem(SAVE,JSON.stringify(P))}catch(e){}}
let P=loadProgress(),S=null,AC=null,drag=null,kc={r:3,c:3},toastT;
const TIPS=['Keep one column or row open for long pieces.','Fill edges first; keep the middle flexible.','Check all 3 pieces before placing the first.','A safe move now can block a piece later.','Clearing two lines at once pays far more.','Avoid leaving 1-cell holes.','Chain clears to build a combo multiplier.'];
const ACH=[['First Clear','Clear a line',()=>P.stats.lines>=1],['10 Levels','Complete 10 levels',()=>Object.keys(P.stars).length>=10],['50 Levels','Complete 50 levels',()=>Object.keys(P.stars).length>=50],
['100 Levels','Complete 100 levels',()=>Object.keys(P.stars).length>=100],['500 Levels','Complete 500 levels',()=>Object.keys(P.stars).length>=500],['1000 Levels','Complete 1000 levels',()=>Object.keys(P.stars).length>=1000],
['10,000 Points','Total score 10,000',()=>P.total>=10000],['100 Line Clears','Clear 100 lines',()=>P.stats.lines>=100],['Combo Master','Reach combo ×4',()=>P.stats.maxCombo>=4],['Perfect Planning','3-star 5 levels (no hints/undo)',()=>P.stats.perfect>=5]];

/* ----- audio / vibration ----- */
function ensureAudio(){if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(AC&&AC.state=='suspended')AC.resume()}
const SND={pick:[[520,0,.06]],place:[[330,0,.07],[440,.05,.08]],bad:[[150,0,.16,'square']],clear:[[523,0,.1],[659,.08,.1],[784,.16,.16]],combo:[[659,0,.08],[784,.07,.08],[988,.14,.08],[1318,.21,.2]],win:[[523,0,.12],[659,.12,.12],[784,.24,.12],[1047,.36,.3]],over:[[300,0,.2],[220,.2,.2],[165,.4,.35]]};
function sfx(k){if(!P.set.sound||!AC)return;SND[k].forEach(([f,t,d,ty])=>{const o=AC.createOscillator(),g=AC.createGain(),s=AC.currentTime+t;o.type=ty||'sine';o.frequency.value=f;g.gain.setValueAtTime(.12,s);g.gain.exponentialRampToValueAtTime(.001,s+d);o.connect(g).connect(AC.destination);o.start(s);o.stop(s+d+.02)})}
function vib(p){if(P.set.vib&&navigator.vibrate)navigator.vibrate(p)}
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>e.classList.remove('on'),1800)}

/* ----- flow ----- */
function show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('on',s.id==id));if(id=='home')renderHome()}
function startLevel(n,fresh=true){n=Math.max(1,n);const lv=generateLevel(n);
 S={lv,board:lv.board.slice(),pieces:[],refill:0,score:0,combo:0,lines:0,moves:0,hints:0,undos:0,hintLeft:3,hist:[],sel:-1,over:false,done:false,recent:[],pv:null,hint:null,flash:null,drop:null};
 if(fresh)P.stats.games++;P.level=n;P.highest=Math.max(P.highest,n);saveProgress();dealPieces();show('game');renderAll()}
function resetLevel(){startLevel(S.lv.n,false)}
function dealPieces(){const lv=S.lv,g=generatePieces(S.board,rng(hash(`${GAME_SEED}:P${lv.n}:${S.refill}:${lv.attempt}`)),lv.d,S.recent);
 S.pieces=g.pieces;S.recent.push(g.key);if(S.recent.length>6)S.recent.shift();S.refill++;S.sel=-1}
const prog=()=>S.lv.obj.type=='score'?S.score:S.lv.obj.type=='lines'?S.lines:S.moves;
function snap(){return JSON.stringify([S.board,S.pieces,S.score,S.combo,S.lines,S.moves,S.refill,S.recent])}
function placePiece(pi,r,c){const p=S&&S.pieces[pi];if(!p||S.over||S.done)return false;if(!canPlacePiece(S.board,p.cells,r,c)){sfx('bad');vib(30);return false}
 S.hist.push(snap());if(S.hist.length>12)S.hist.shift();
 const res=applyMove(S.board,p.cells,r,c,p.color);S.board=res.board;S.combo=res.lines?S.combo+1:0;
 const g=calculateScore(p.cells.length,res.lines,S.combo);S.score+=g;S.lines+=res.lines;S.moves++;
 P.total+=g;P.best=Math.max(P.best,S.score);P.stats.lines+=res.lines;P.stats.blocks+=p.cells.length;P.stats.maxCombo=Math.max(P.stats.maxCombo,S.combo);
 S.drop=new Set(p.cells.map(([a,d])=>(r+a)*N+c+d));S.flash=res.idx;S.hint=null;S.pv=null;S.pieces[pi]=null;S.sel=-1;
 if(S.pieces.every(x=>!x))dealPieces();
 popup(res.lines?`+${g}${S.combo>1?`  Combo ×${S.combo}`:''}`:`+${g}`);
 if(res.lines){sfx(S.combo>1?'combo':'clear');vib([20,30,40])}else{sfx('place');vib(12)}
 setTimeout(()=>{if(S){S.flash=null;S.drop=null;renderBoard()}},520);
 saveProgress();
 if(prog()>=S.lv.obj.target)completeLevel();else if(!hasAnyLegalMove(S.board,S.pieces))gameOver();
 checkAch();renderAll();return true}
function undo(){if(!S||!S.hist.length||S.done)return toast('Nothing to undo');const [b,ps,sc,cb,ln,mv,rf,rc]=JSON.parse(S.hist.pop());
 S.board=b;S.pieces=ps;S.score=sc;S.combo=cb;S.lines=ln;S.moves=mv;S.refill=rf;S.recent=rc;S.over=false;S.undos++;S.sel=-1;S.hint=null;S.pv=null;closeModal();sfx('pick');renderAll()}
function doHint(){if(!S||S.over||S.done)return;if(S.hintLeft<=0)return toast('No hints left on this level');const h=generateHint(S.board,S.pieces);if(!h)return;
 S.hintLeft--;S.hints++;P.stats.hints++;S.sel=h.pi;S.hint={pi:h.pi,set:new Set(S.pieces[h.pi].cells.map(([a,d])=>(h.r+a)*N+h.c+d))};saveProgress();renderAll();toast(`Try placing piece ${h.pi+1} here`)}
function completeLevel(){S.done=true;const u=S.hints+S.undos,st=u==0?3:u<=2?2:1,n=S.lv.n;P.stars[n]=Math.max(P.stars[n]||0,st);P.stats.completed++;if(st==3)P.stats.perfect++;
 P.level=n+1;P.highest=Math.max(P.highest,n+1);saveProgress();sfx('win');vib([60,40,120,40,220]);
 setTimeout(()=>modal(`<h2>🎉 Level Complete!</h2><div class="stars">${'⭐'.repeat(st)}${'☆'.repeat(3-st)}</div><p>Score <b>${S.score}</b><br>Best <b>${P.best}</b></p>`,
  [['▶ Next Level',()=>startLevel(n+1),'pri'],['Replay',()=>startLevel(n,false)],['Home',()=>show('home')]]),450)}
function gameOver(){S.over=true;sfx('over');vib([100,60,100]);setTimeout(()=>{if(S&&S.over)modal(`<h2>NO MORE MOVES</h2><p>Level <b>${S.lv.n}</b><br>Score <b>${S.score}</b><br>Best <b>${P.best}</b></p>`,
  [['Try Again (undo last move)',()=>S.hist.length?undo():resetLevel(),'pri'],['Restart Level',resetLevel],['Home',()=>show('home')]])},500)}
function checkAch(){ACH.forEach(([n,,f])=>{if(!P.ach[n]&&f()){P.ach[n]=1;saveProgress();toast('🏆 '+n)}})}

/* ----- rendering ----- */
function popup(t){const e=document.createElement('div');e.className='pop';e.textContent=t;$('#bw').appendChild(e);setTimeout(()=>e.remove(),900)}
function renderBoard(){const cs=$('#board').children;for(let i=0;i<64;i++){const v=S.board[i];let c='cell'+(v?' b c'+v:'');
 if(S.drop&&S.drop.has(i))c+=' drop';if(S.flash&&S.flash.has(i))c+=' flash';if(S.pv&&S.pv.set.has(i))c+=S.pv.ok?' pv-ok':' pv-bad';if(S.hint&&S.hint.set.has(i))c+=' hint';
 if(cs[i].className!==c)cs[i].className=c}}
function renderTray(){$('#tray').innerHTML=S.pieces.map((p,i)=>{if(!p)return`<div class="slot"><div class="piece empty" style="--w:1"></div></div>`;
 let g='';for(let r=0;r<p.h;r++)for(let c=0;c<p.w;c++)g+=p.cells.some(x=>x[0]==r&&x[1]==c)?`<i class="b c${p.color}"></i>`:'<i></i>';
 return`<div class="slot"><button class="piece${S.sel==i?' sel':''}${S.hint&&S.hint.pi==i?' hint':''}" data-i="${i}" style="--w:${p.w}" aria-label="Piece ${i+1}, ${p.cells.length} blocks">${g}</button></div>`}).join('')}
function renderAll(){const o=S.lv.obj;$('#s-lv').textContent=S.lv.n;$('#s-sc').textContent=S.score;$('#s-best').textContent=P.best;
 $('#goal').textContent=`${tierName(S.lv.d,S.lv.n)} · ${{score:'Reach '+o.target+' points',lines:'Clear '+o.target+' lines',place:'Place '+o.target+' pieces'}[o.type]} (${Math.min(prog(),o.target)}/${o.target})`;
 $('#prog').style.width=Math.min(100,prog()/o.target*100)+'%';$('#tip').textContent=(S.combo>1?`Combo ×${S.combo}! `:'')+TIPS[S.lv.n%TIPS.length];
 $('#b-hint').textContent=`💡 Hint (${S.hintLeft})`;$('#b-undo').disabled=!S.hist.length;renderBoard();renderTray();syncSettings()}
function renderHome(){$('#h-lv').textContent=P.level;$('#h-best').textContent=P.best;$('#h-hi').textContent=P.highest}
function syncSettings(){document.documentElement.dataset.theme=P.set.dark?'dark':'light';document.documentElement.classList.toggle('reduce',P.set.reduce);
 $('#b-sound').textContent=P.set.sound?'🔊':'🔇';$('#b-theme').textContent=P.set.dark?'☀️':'🌙'}
function panel(kind){const p=$('#panel'),s=P.stats;let h=`<div class="bar"><button class="ib" data-act="home" aria-label="Back">←</button><h2 style="flex:1;text-align:center;margin:0">`;
 if(kind=='stats'){h+=`📊 Statistics</h2></div><div class="rows">`+[['Games Played',s.games],['Levels Completed',Object.keys(P.stars).length],['Highest Level',P.highest],['Best Score',P.best],['Total Lines Cleared',s.lines],['Highest Combo','×'+s.maxCombo],['Total Blocks Placed',s.blocks],['Hints Used',s.hints]].map(([a,b])=>`<div class="row"><span>${a}</span><b>${b}</b></div>`).join('')+'</div>'}
 else if(kind=='ach'){h+=`🏆 Achievements</h2></div><div class="rows">`+ACH.map(([n,d])=>`<div class="row ${P.ach[n]?'':'lock'}"><span>${P.ach[n]?'🏆':'🔒'} ${n}<small>${d}</small></span></div>`).join('')+'</div>'}
 else{const t=(l,k)=>`<div class="row"><span>${l}</span><button class="btn" data-act="${k}">${P.set[k=='sound'?'sound':k=='vib'?'vib':k=='theme'?'dark':'reduce']?'ON':'OFF'}</button></div>`;
  h+=`⚙️ Settings</h2></div><div class="rows">${t('🔊 Sound','sound')}${t('📳 Vibration','vib')}${t('🌙 Dark mode','theme')}${t('Reduced motion','reduce')}<div class="row"><span>Reset progress<small>Erases levels, scores, stars</small></span><button class="btn" data-act="resetall">Reset</button></div></div>`}
 p.innerHTML=h;p.dataset.kind=kind;show('panel')}
function modal(html,btns){const m=$('#modal');m.innerHTML=`<div class="card" role="dialog" aria-modal="true">${html}<div class="mbtns">${btns.map((b,i)=>`<button class="btn ${b[2]||''}" data-m="${i}">${b[0]}</button>`).join('')}</div></div>`;m._b=btns;m.hidden=false;m.querySelector('button').focus()}
function closeModal(){$('#modal').hidden=true}
const confirmBox=(t,yes)=>modal(`<h2>Are you sure?</h2><p>${t}</p>`,[['Yes',yes,'pri'],['Cancel',()=>{}]]);

/* ----- placement input: drag + tap + keyboard ----- */
function setPv(pi,r,c){const p=S.pieces[pi];if(!p){S.pv=null;return}const set=new Set();p.cells.forEach(([a,d])=>{if(inb(r+a,c+d))set.add((r+a)*N+c+d)});S.pv=set.size?{set,ok:canPlacePiece(S.board,p.cells,r,c)}:null}
function selectPiece(i){S.sel=S.sel==i?-1:i;S.hint=null;S.pv=null;sfx('pick');document.querySelectorAll('.piece').forEach(e=>e.classList.toggle('sel',+e.dataset.i==S.sel));renderBoard()}
function metrics(){const c=$('#board').children,a=c[0].getBoundingClientRect(),b=c[1].getBoundingClientRect();return{x:a.left,y:a.top,cs:a.width,pitch:b.left-a.left,gap:b.left-a.right}}
$('#tray').addEventListener('pointerdown',e=>{const el=e.target.closest('.piece');if(!el||!S||S.over||S.done)return;const i=+el.dataset.i;if(!S.pieces[i])return;e.preventDefault();ensureAudio();drag={i,sx:e.clientX,sy:e.clientY,moved:false,el,was:S.sel==i}});
window.addEventListener('pointermove',e=>{if(!drag)return;const p=S.pieces[drag.i];if(!drag.moved){if(Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)<9)return;drag.moved=true;
 if(S.sel!=drag.i)selectPiece(drag.i);const m=metrics(),g=document.createElement('div');g.id='ghost';g.style.gridTemplateColumns=`repeat(${p.w},${m.cs}px)`;g.style.gap=m.gap+'px';
 let h='';for(let r=0;r<p.h;r++)for(let c=0;c<p.w;c++)h+=p.cells.some(x=>x[0]==r&&x[1]==c)?`<i class="b c${p.color}" style="width:${m.cs}px;height:${m.cs}px"></i>`:`<i style="width:${m.cs}px;height:${m.cs}px"></i>`;
 g.innerHTML=h;document.body.appendChild(g);drag.g=g;drag.m=m;drag.el.classList.add('dragging')}
 const m=drag.m,w=p.w*m.pitch,h=p.h*m.pitch,L=e.clientX-w/2,T=e.clientY-h-56;drag.g.style.left=L+'px';drag.g.style.top=T+'px';
 drag.r=Math.round((T-m.y)/m.pitch);drag.c=Math.round((L-m.x)/m.pitch);setPv(drag.i,drag.r,drag.c);renderBoard()});
window.addEventListener('pointerup',()=>{if(!drag)return;const d=drag;drag=null;if(d.g)d.g.remove();d.el.classList.remove('dragging');
 if(d.moved){if(S.pv&&S.pv.ok)placePiece(d.i,d.r,d.c);else{if(S.pv)sfx('bad');S.pv=null;renderBoard()}}else if(d.was)selectPiece(d.i);else selectPiece(d.i)});
window.addEventListener('pointercancel',()=>{if(drag){if(drag.g)drag.g.remove();drag=null;if(S){S.pv=null;renderAll()}}});
$('#tray').addEventListener('click',e=>{const el=e.target.closest('.piece');if(el&&e.detail===0)selectPiece(+el.dataset.i)});
$('#board').addEventListener('click',e=>{const c=e.target.closest('.cell');if(!c||!S||S.sel<0)return;ensureAudio();const i=[...c.parentNode.children].indexOf(c),p=S.pieces[S.sel];
 placePiece(S.sel,Math.floor(i/N)-Math.floor((p.h-1)/2),i%N-Math.floor((p.w-1)/2))});
document.addEventListener('keydown',e=>{if(!$('#modal').hidden||!S||!$('#game').classList.contains('on'))return;const k=e.key;
 if('123'.includes(k)&&k)return S.pieces[k-1]&&selectPiece(+k-1);if(k=='z')return undo();if(k=='h')return doHint();if(k=='Escape')return show('home');
 const mv={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]}[k];
 if(mv){e.preventDefault();kc.r=Math.max(0,Math.min(7,kc.r+mv[0]));kc.c=Math.max(0,Math.min(7,kc.c+mv[1]));if(S.sel>=0){setPv(S.sel,kc.r,kc.c);renderBoard()}}
 else if((k=='Enter'||k==' ')&&S.sel>=0){e.preventDefault();placePiece(S.sel,kc.r,kc.c)}});

/* ----- buttons ----- */
document.addEventListener('click',e=>{const mb=e.target.closest('[data-m]');if(mb){const m=$('#modal'),f=m._b[+mb.dataset.m][1];closeModal();f();return}
 const a=e.target.closest('[data-act]');if(!a)return;ensureAudio();const k=a.dataset.act,pn=()=>$('#panel').classList.contains('on')&&panel($('#panel').dataset.kind);
 if(k=='play')startLevel(P.level,false);else if(k=='home')show('home');else if(k=='stats'||k=='ach'||k=='settings')panel(k);
 else if(k=='undo')undo();else if(k=='hint')doHint();
 else if(k=='next'){if(!S)return;if(S.lv.n<P.highest)startLevel(S.lv.n+1,false);else toast(`Finish the goal first: ${Math.min(prog(),S.lv.obj.target)}/${S.lv.obj.target}`)}
 else if(k=='reset')confirmBox('Restart this level? Its score resets; progress is kept.',resetLevel);
 else if(k=='sound'){P.set.sound=!P.set.sound;saveProgress();syncSettings();pn()}else if(k=='vib'){P.set.vib=!P.set.vib;saveProgress();vib(40);pn()}
 else if(k=='theme'){P.set.dark=!P.set.dark;saveProgress();syncSettings();pn()}else if(k=='reduce'){P.set.reduce=!P.set.reduce;saveProgress();syncSettings();pn()}
 else if(k=='resetall')confirmBox('Erase ALL progress, scores and achievements?',()=>{const s=P.set;P=defaults();P.set=s;saveProgress();S=null;toast('Progress reset');show('home')})});

(function init(){const b=$('#board');for(let i=0;i<64;i++){const d=document.createElement('div');d.className='cell';d.setAttribute('role','gridcell');b.appendChild(d)}
 syncSettings();renderHome();if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{})})();
}
