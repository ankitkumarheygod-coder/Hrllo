const N=8, COLORS=["#5b7cfa","#59c7b2","#8b72e8","#f4a261","#e76f51","#e9c46a","#4d96ff"];
const boardEl=document.getElementById("board"),trayEl=document.getElementById("tray");
const levelEl=document.getElementById("level"),scoreEl=document.getElementById("score"),bestEl=document.getElementById("best"),tipEl=document.getElementById("tip");
let level=Number(localStorage.getItem("mb_level")||1), score=Number(localStorage.getItem("mb_score")||0), best=Number(localStorage.getItem("mb_best")||0);
let grid, pieces, selected=-1, history=[];

function rng(seed){let x=(seed>>>0)||1;return()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296}}
function makePiece(r){
  const hard=Math.min(1,(level-1)/150), choices=[
    [[0,0]],[[0,0],[1,0]],[[0,0],[0,1]],[[0,0],[1,0],[0,1]],
    [[0,0],[1,0],[2,0]],[[0,0],[0,1],[0,2]],[[0,0],[1,0],[1,1]],
    [[0,0],[1,0],[1,1],[2,1]],[[0,0],[1,0],[0,1],[1,1]]
  ];
  let pool=choices;
  if(hard>.35) pool=choices.slice(2);
  if(hard>.7) pool=choices.slice(3);
  if(hard>.9) pool=choices.slice(4);
  const p=pool[Math.floor(r()*pool.length)];
  return {cells:p.map(x=>x.slice()), color:COLORS[Math.floor(r()*COLORS.length)]};
}
function generate(){
  const r=rng(level*7919+17); grid=Array.from({length:N},()=>Array(N).fill(null));
  // Procedural pressure: higher levels start with more carefully scattered blocks.
  const fill=Math.min(.18,(level-1)/5000);
  for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(r()<fill)grid[y][x]=COLORS[Math.floor(r()*COLORS.length)];
  pieces=[makePiece(r),makePiece(r),makePiece(r)];
  selected=-1;history=[]; render(); updateTip();
}
function render(){
  levelEl.textContent=level;scoreEl.textContent=score;bestEl.textContent=best;
  boardEl.innerHTML="";
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){let c=document.createElement("div");c.className="cell"+(grid[y][x]?" filled":"");if(grid[y][x])c.style.background=grid[y][x];c.onclick=()=>place(x,y);boardEl.appendChild(c)}
  trayEl.innerHTML="";
  pieces.forEach((p,i)=>{let el=document.createElement("div");el.className="piece"+(selected===i?" selected":"");let minx=Math.min(...p.cells.map(c=>c[0])),maxx=Math.max(...p.cells.map(c=>c[0])),miny=Math.min(...p.cells.map(c=>c[1])),maxy=Math.max(...p.cells.map(c=>c[1]));let m=document.createElement("div");m.className="mini";m.style.gridTemplateColumns=`repeat(${maxx-minx+1},22px)`;for(let y=miny;y<=maxy;y++)for(let x=minx;x<=maxx;x++){let i2=document.createElement("i");let on=p.cells.some(c=>c[0]===x&&c[1]===y);i2.style.background=on?p.color:"transparent";m.appendChild(i2)}el.appendChild(m);el.onclick=()=>{selected=i;render()};trayEl.appendChild(el)})
  document.getElementById("next").disabled=pieces.length>0;
}
function canPlace(p,x,y){return p.cells.every(([dx,dy])=>{let xx=x+dx,yy=y+dy;return xx>=0&&xx<N&&yy>=0&&yy<N&&!grid[yy][xx]})}
function place(x,y){
  if(selected<0||!pieces[selected])return;
  let p=pieces[selected];if(!canPlace(p,x,y))return;
  history.push(JSON.stringify({grid,pieces,score}));
  p.cells.forEach(([dx,dy])=>grid[y+dy][x+dx]=p.color);
  score+=p.cells.length*10; pieces.splice(selected,1);selected=-1;
  clearLines();
  if(score>best){best=score;localStorage.setItem("mb_best",best)}
  localStorage.setItem("mb_score",score); render();
  if(pieces.length===0){setTimeout(()=>{pieces=[makePiece(rng(level*1231+score)),makePiece(rng(level*1237+score)),makePiece(rng(level*1249+score))];render()},250)}
  else if(!hasAnyMove()){setTimeout(gameOver,250)}
}
function clearLines(){
 let rows=[],cols=[];
 for(let y=0;y<N;y++)if(grid[y].every(Boolean))rows.push(y);
 for(let x=0;x<N;x++)if(grid.every(r=>r[x]))cols.push(x);
 let n=rows.length+cols.length;
 rows.forEach(y=>grid[y].fill(null));cols.forEach(x=>grid.forEach(r=>r[x]=null));
 if(n)score+=n*n*100;
}
function hasAnyMove(){return pieces.some(p=>{for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(canPlace(p,x,y))return true;return false})}
function gameOver(){document.getElementById("message").classList.remove("hidden");document.getElementById("message").textContent=`Level ${level} — जगह खत्म! Reset करके फिर सोचो.`}
document.getElementById("undo").onclick=()=>{if(history.length){let h=JSON.parse(history.pop());grid=h.grid;pieces=h.pieces;score=h.score;selected=-1;document.getElementById("message").classList.add("hidden");render()}};
document.getElementById("reset").onclick=()=>{score=0;generate();document.getElementById("message").classList.add("hidden")};
document.getElementById("hint").onclick=()=>{tipEl.textContent="Hint: सबसे बड़े piece को रखने से पहले अगले 2–3 moves के लिए खाली जगह बचाओ।"};
document.getElementById("next").onclick=()=>{if(!pieces.length){level++;localStorage.setItem("mb_level",level);generate()}};
function updateTip(){let d=level<20?"पहले placement समझो।":level<100?"अब आगे की जगह बचाकर चलो।":level<500?"Trap pieces पर ध्यान दो — हर खाली cell की value है।":"Master mode: हर move को 2–3 चाल आगे सोचो।";tipEl.textContent=d}
generate();
