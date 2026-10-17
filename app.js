import { Chess } from "https://cdn.jsdelivr.net/npm/chess.js@1.4.0/+esm";

const $ = id => document.getElementById(id);
const PIECES = {wk:"♔",wq:"♕",wr:"♖",wb:"♗",wn:"♘",wp:"♙",bk:"♚",bq:"♛",br:"♜",bb:"♝",bn:"♞",bp:"♟"};

// Small built-in opening repertoire. A move is labelled Book only when the
// complete played SAN sequence is a prefix of a recognized opening line.
const BOOK_LINES = [
  "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3",
  "e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8",
  "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Nc3 Nxe4 O-O",
  "e4 e5 Nf3 Nc6 d4 exd4 Nxd4",
  "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6",
  "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5",
  "e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6",
  "e4 c5 Nc3 Nc6 f4 g6 Nf3 Bg7 Bb5",
  "e4 e6 d4 d5 Nc3 Nf6 e5 Nfd7 f4 c5 Nf3 Nc6",
  "e4 e6 d4 d5 Nd2 Nf6 e5 Nfd7 Bd3 c5 c3 Nc6",
  "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6",
  "e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2",
  "d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3",
  "d4 d5 c4 e6 Nf3 Nf6 Nc3 Be7",
  "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2",
  "d4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5",
  "d4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O",
  "Nf3 d5 g3 Nf6 Bg2 e6 O-O Be7 d3 O-O",
  "e4 e5 Bc4 Nf6 d3 Nc6 Nf3 Be7 O-O O-O",
  "e4 e5 f4 exf4 Nf3 g5 Bc4 g4 O-O gxf3 Qxf3 Qf6",
  "e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6",
  "d4 d5 Nf3 Nf6 c4 e6 g3 Be7 Bg2 O-O O-O",
  "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5",
  "e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6",
  "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4"
].map(line => line.split(/\s+/).map(normalizeSan));
function normalizeSan(san) { return String(san || "").replace(/[+#?!]+$/g, ""); }
function isBookPly(ply) {
  if (ply < 1 || ply > 30) return false;
  const played = moves.slice(0, ply).map(m => normalizeSan(m.san));
  return BOOK_LINES.some(line => line.length >= ply && played.every((san, i) => line[i] === san));
}
const ANALYSIS_DEPTH = 14; // practical target for phones; time-limited search is faster
const ANALYSIS_TIME_MS = 700; // per position; raise to 1200-1800 for deeper but slower analysis
let chess = new Chess(), moves = [], positions = [], analyses = [], currentPly = 0, engine = null, engineReady = false, analyzing = false, queue = [], activeResolve = null, lastSquares = [];

function setStatus(text, ready=false){ $("engineStatus").textContent=text; $("engineDot").parentElement.classList.toggle("ready",ready); }
function renderBoard(){
  const board=$("board"); board.innerHTML="";
  const grid=chess.board();
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const sq=document.createElement("div"); sq.className="square "+((r+c)%2===0?"light":"dark");
    const file="abcdefgh"[c], rank=8-r, name=file+rank;
    if(lastSquares.includes(name)) sq.classList.add("last");
    if(analyses[currentPly-1]?.bestFrom===name) sq.classList.add("best-from");
    if(analyses[currentPly-1]?.bestTo===name) sq.classList.add("best-to");
    const currentMoveAnalysis = currentPly > 0 ? analyses[currentPly] : null;
    if(currentPly > 0 && moves[currentPly-1]?.to===name && currentMoveAnalysis?.quality){
      const mark = moveMark(currentMoveAnalysis.quality);
      if(mark){
        const annotation=document.createElement("span");
        annotation.className="board-annotation "+annotationClass(currentMoveAnalysis.quality);
        annotation.textContent=mark;
        annotation.setAttribute("aria-label",currentMoveAnalysis.quality);
        annotation.title=currentMoveAnalysis.quality;
        sq.appendChild(annotation);
      }
    }
    const piece=grid[r][c];
    if(piece){const img=document.createElement("img");img.className="piece-img "+(piece.color==="w"?"white":"black");img.src="pieces/"+piece.color+piece.type+".png";img.alt=({k:"Vua",q:"Hậu",r:"Xe",b:"Tượng",n:"Mã",p:"Tốt"})[piece.type]+(piece.color==="w"?" trắng":" đen");sq.appendChild(img);}
    if(c===0||r===7){const coord=document.createElement("span");coord.className="coord";coord.textContent=c===0?rank:file;sq.appendChild(coord);}
    board.appendChild(sq);
  }
  $("moveCounter").textContent=currentPly===0?"Vị trí ban đầu":`Nước ${Math.ceil(currentPly/2)} · ${currentPly%2?"Trắng":"Đen"}`;
  $("firstBtn").disabled=currentPly===0; $("prevBtn").disabled=currentPly===0;
  $("nextBtn").disabled=currentPly>=moves.length; $("lastBtn").disabled=currentPly>=moves.length;
  const a=analyses[currentPly]; 
  if(a){$("score").textContent=formatScore(a.score);$("feedback").textContent=a.feedback;$("bestMove").textContent=a.bestSan||a.bestMove||"—";$("moveBadge").textContent=currentPly?`${Math.ceil(currentPly/2)}${currentPly%2?".":"..."}`:"Bắt đầu";updateEvalBar(a.score);}
  else {$("score").textContent="Chưa phân tích";$("feedback").textContent=currentPly?"Chưa có phân tích cho vị trí này. Hãy nhấn Phân tích ván cờ.":"Tải ván cờ và nhấn “Phân tích ván cờ” để bắt đầu.";$("bestMove").textContent="—";$("moveBadge").textContent=currentPly?`Nước ${Math.ceil(currentPly/2)}`:"—";}
  document.querySelectorAll(".move-item").forEach(b=>b.classList.toggle("active",Number(b.dataset.ply)===currentPly));
}
function formatScore(cp){if(cp===null||cp===undefined)return "—";if(typeof cp==="string")return cp;if(Math.abs(cp)>9000)return cp>0?"Mạng Trắng":"Mạng Đen";return `${cp>0?"+":""}${(cp/100).toFixed(1)}`;}
function updateEvalBar(cp){const v=Math.max(-8,Math.min(8,Number(cp)||0));const white=Math.max(4,Math.min(96,50+v/16*50));$("evalWhite").style.height=white+"%";$("evalBlack").style.height=(100-white)+"%";$("evalText").textContent=formatScore(cp);}
function moveMark(quality){
  return ({"Brilliant":"‼","Great Move":"!","Best Move":"★","Excellent":"👍","Good":"✓","Book":"▤","Inaccuracy":"?!","Mistake":"?","Miss":"×","Blunder":"??","Best":"★","Great":"!"})[quality]??"";
}
function annotationClass(quality){
  if(["Brilliant","Great Move","Best Move","Excellent","Good","Book","Best","Great"].includes(quality))return "annotation-good";
  if(quality==="Inaccuracy")return "annotation-warn";
  return "annotation-bad";
}
function renderMoves(){
  const list=$("movesList");list.innerHTML="";
  if(!moves.length){list.innerHTML='<p class="empty">Tải PGN để xem các nước đi.</p>';return;}
  for(let i=0;i<moves.length;i+=2){
    const pair=document.createElement("div");pair.className="move-pair";
    const num=document.createElement("span");num.className="move-number";num.textContent=(i/2+1)+".";
    pair.appendChild(num);
    for(let j=i;j<Math.min(i+2,moves.length);j++){
      const b=document.createElement("button");b.className="move-item";b.dataset.ply=j+1;
      const an=analyses[j+1];const san=document.createElement("span");san.className="move-san";san.textContent=moves[j].san;b.appendChild(san);
      const mark=moveMark(an?.quality);if(mark){const badge=document.createElement("span");badge.className="move-mark "+annotationClass(an.quality);badge.textContent=mark;b.appendChild(badge);b.title=an?.quality||"Đang chờ phân tích";}
      if(an?.quality==="Sai lầm"||an?.quality==="Blunder")b.classList.add("mistake");else if(an?.quality==="Chưa chính xác"||an?.quality==="Inaccuracy"||an?.quality==="Nước chưa tối ưu")b.classList.add("inaccuracy");
      b.addEventListener("click",()=>goTo(Number(b.dataset.ply)));pair.appendChild(b);
    }
    if(pair.children.length===2){const spacer=document.createElement("span");pair.appendChild(spacer);}
    list.appendChild(pair);
  }
}
function loadPgn(pgn){
  try{
    const parsed=new Chess();parsed.loadPgn(pgn);
    chess=parsed; moves=chess.history({verbose:true}); positions=[new Chess().fen()];
    const replay=new Chess();for(const m of moves){replay.move(m);positions.push(replay.fen());}
    analyses=[];currentPly=0;lastSquares=[];$("whiteMeta").textContent="Độ chính xác — · Elo ước tính —";$("blackMeta").textContent="Độ chính xác — · Elo ước tính —";$("whiteRating").textContent="—";$("blackRating").textContent="—";const headers=chess.getHeaders?.()||{};
    $("whiteName").textContent=headers.White||"Trắng";$("blackName").textContent=headers.Black||"Đen";
    $("gameResult").textContent=headers.Result&&headers.Result!=="*" ? headers.Result : "PGN";
    renderMoves();goTo(0);setProgress(0,"Đã tải "+moves.length+" nửa nước đi. Sẵn sàng phân tích.");
    return true;
  }catch(e){alert("Không đọc được PGN. Hãy kiểm tra nội dung tệp hoặc thử tải lại từ Chess.com.\n\n"+e.message);return false;}
}
function goTo(ply){
  currentPly=Math.max(0,Math.min(moves.length,ply));chess=new Chess();
  for(let i=0;i<currentPly;i++)chess.move(moves[i]);
  const m=moves[currentPly-1];lastSquares=m?[m.from,m.to]:[];
  renderBoard();renderMoves();
}
function setProgress(pct,msg){$("progressBar").style.width=Math.max(0,Math.min(100,pct))+"%";$("progressText").textContent=msg;}
function initEngine(){
  if(engine) return;
  try{
    setStatus("Đang tải Stockfish…");
    engine=new Worker("engine/stockfish-19-lite-single.js");
    engine.onmessage=e=>{
      const line=typeof e.data==="string"?e.data:String(e.data);
      if(line==="uciok"){engine.postMessage("isready");return;}
      if(line==="readyok"){engineReady=true;setStatus("Stockfish sẵn sàng",true);if(activeResolve){activeResolve("ready");activeResolve=null;}return;}
      if(line.startsWith("info ")) {
        const cp=line.match(/\bscore cp (-?\d+)/), mate=line.match(/\bscore mate (-?\d+)/), depth=line.match(/\bdepth (\d+)/);
        if(window.currentEngineResult){if(cp)window.currentEngineResult.score=Number(cp[1]);if(mate)window.currentEngineResult.score=Number(mate[1])>0?10000:-10000;if(depth)window.currentEngineResult.depth=Number(depth[1]);}
      }
      if(line.startsWith("bestmove ")){
        const best=line.split(/\s+/)[1];if(activeResolve){activeResolve({best,score:window.currentEngineResult?.score??0,depth:window.currentEngineResult?.depth??0});activeResolve=null;}
      }
    };
    engine.onerror=()=>{setStatus("Không tải được engine");setProgress(0,"Kiểm tra hai tệp Stockfish trong thư mục engine/ rồi tải lại trang.");};
    engine.postMessage("uci");
  }catch(e){setStatus("Lỗi engine");setProgress(0,"Không thể khởi chạy Stockfish: "+e.message);}
}
function waitReady(){return new Promise(resolve=>{activeResolve=resolve;if(engineReady){activeResolve=null;resolve("ready");}else engine.postMessage("isready");});}
function runPosition(fen,depth=10){
  return new Promise(resolve=>{
    window.currentEngineResult={score:0,depth:0};activeResolve=resolve;
    engine.postMessage("position fen "+fen);engine.postMessage("go movetime "+ANALYSIS_TIME_MS);
  });
}
function sameUci(move, uci){
  if(!move || !uci || uci==="(none)") return false;
  return move.from+move.to+(move.promotion||"")===uci.toLowerCase();
}
function classifyMove(loss, isBest, ply, beforeScore, afterScore){
  // Heuristic labels inspired by Chess.com; exact labels require Chess.com's private classifier/opening database.
  if(isBest && loss<=8 && ply>12) return "Best Move";
  if(isBest && loss<=18) return "Best Move";
  if(isBest && loss<=35) return "Great Move";
  if(loss<=15) return "Excellent";
  if(loss<=45) return "Good";
  if(beforeScore>=300 && afterScore<beforeScore-150) return "Miss";
  if(loss<=100) return "Inaccuracy";
  if(loss<=200) return "Mistake";
  return "Blunder";
}
function feedbackFor(quality, san, bestSan, cp){
  const names={"Brilliant":"Brilliant (!!)","Great Move":"Great Move (!)","Best Move":"Best Move (★)","Excellent":"Excellent (👍)","Good":"Good (✓)","Book":"Book (▤)","Inaccuracy":"Inaccuracy (?!)","Mistake":"Mistake (?)","Miss":"Miss (×)","Blunder":"Blunder (??)"};
  return `${names[quality]||quality}: ${san||"Vị trí ban đầu"}${bestSan?`. Nước đề xuất của Stockfish: ${bestSan}.`:"."}`;
}
function updatePlayerStats(){
  const losses={w:[],b:[]};
  for(let ply=1;ply<analyses.length;ply++){
    const before=analyses[ply-1], after=analyses[ply];
    if(!before||!after) continue;
    const whiteMover=(ply%2===1);
    const loss=Math.max(0, whiteMover ? before.score-after.score : after.score-before.score);
    losses[whiteMover?"w":"b"].push(Math.min(1000,loss));
  }
  for(const side of ["w","b"]){
    const arr=losses[side];
    if(!arr.length) continue;
    const avg=arr.reduce((a,b)=>a+b,0)/arr.length;
    // A transparent, game-only heuristic; not Chess.com’s official accuracy/Elo formula.
    const accuracy=Math.max(1,Math.min(99,Math.round(100*Math.exp(-avg/180))));
    const blunders=arr.filter(v=>v>=200).length;
    const estimatedElo=Math.max(400,Math.min(2600,Math.round((450+accuracy*18-blunders*35)/50)*50));
    const meta=$(side==="w"?"whiteMeta":"blackMeta");
    if(meta) meta.textContent=`Độ chính xác ${accuracy}% · Elo ước tính ~${estimatedElo}`;
    const rating=$(side==="w"?"whiteRating":"blackRating");
    if(rating) rating.textContent=`${accuracy}%`;
  }
}

async function analyzeGame(){
  if(analyzing)return;
  if(!moves.length){alert("Hãy tải PGN trước.");return;}
  initEngine();if(!engine)return;analyzing=true;$("analyzeBtn").disabled=true;$("analyzeBtn").textContent="Đang phân tích…";
  try{
    await waitReady();
    // Evaluate each position from White's perspective. For the move just played,
    // loss is measured from the side that made that move.
    analyses=Array(moves.length+1).fill(null);
    for(let ply=0;ply<=moves.length;ply++){
      const res=await runPosition(positions[ply],ANALYSIS_DEPTH);
      // UCI score is relative to the side to move; convert to White's perspective.
      const sideToMove=positions[ply].split(" ")[1]||"w";
      const score=sideToMove==="w"?res.score:-res.score;
      let bestSan=res.best;
      try{const temp=new Chess(positions[ply]);const uci=res.best;if(uci&&uci!=="(none)"){const from=uci.slice(0,2),to=uci.slice(2,4),promotion=uci[4];const mv=temp.move({from,to,promotion});bestSan=mv?.san||uci;}}catch{}
      let quality="—", feedback="Vị trí ban đầu. Stockfish đang tìm nước đi tốt nhất.";
      if(ply>0){
        const moverWhite=(ply%2===1);
        const prev=analyses[ply-1]?.score??score;
        const loss=Math.max(0, moverWhite ? prev-score : score-prev);
        const beforeBest=analyses[ply-1]?.bestMove;
        const isBest=sameUci(moves[ply-1],beforeBest);
        quality=isBookPly(ply) ? "Book" : classifyMove(loss,isBest,ply,prev,score);
        feedback=feedbackFor(quality,moves[ply-1].san,bestSan,score);
      }
      analyses[ply]={score,bestMove:res.best,bestSan,depth:res.depth,quality,feedback};
      const pct=(ply+1)/(moves.length+1)*100;
      setProgress(pct,`Đang phân tích vị trí ${ply+1}/${moves.length+1} · mục tiêu nhanh ${ANALYSIS_TIME_MS} ms/vị trí · độ sâu đạt ${res.depth||0}`);
      if(ply===currentPly)renderBoard();
      if(ply>0)renderMoves();
    }
    setProgress(100,"Hoàn tất phân tích "+(moves.length+1)+" vị trí.");
    updatePlayerStats();
    goTo(currentPly);
  }catch(e){setProgress(0,"Có lỗi khi phân tích: "+e.message);console.error(e);}
  finally{analyzing=false;$("analyzeBtn").disabled=false;$("analyzeBtn").textContent="Phân tích lại";}
}
$("loadPgnBtn").addEventListener("click",()=>loadPgn($("pgnInput").value.trim()));
$("pgnFile").addEventListener("change",async e=>{const f=e.target.files?.[0];if(f){const text=await f.text();$("pgnInput").value=text;loadPgn(text);}});
$("firstBtn").addEventListener("click",()=>goTo(0));$("prevBtn").addEventListener("click",()=>goTo(currentPly-1));$("nextBtn").addEventListener("click",()=>goTo(currentPly+1));$("lastBtn").addEventListener("click",()=>goTo(moves.length));
$("analyzeBtn").addEventListener("click",analyzeGame);
$("urlBtn").addEventListener("click",async()=>{
  const url=$("gameUrl").value.trim();if(!url){alert("Dán link ván cờ Chess.com trước.");return;}
  if(!/https?:\/\/(www\.)?chess\.com\//i.test(url)){alert("Vui lòng nhập đường dẫn thuộc chess.com.");return;}
  setProgress(0,"Đang thử lấy PGN từ đường dẫn…");
  try{
    const candidates=[url.replace(/\/+$/,"")+".pgn",url.replace(/\/+$/,"")+"/pgn"];
    let success=false;
    for(const u of candidates){try{const r=await fetch(u);if(!r.ok)continue;const t=await r.text();if(t.includes("[")&&loadPgn(t)){$("pgnInput").value=t;success=true;break;}}catch{}}
    if(!success)throw new Error("Chess.com có thể chặn yêu cầu từ website khác hoặc link không phải đường dẫn PGN trực tiếp.");
    setProgress(0,"Đã nhập PGN từ link.");
  }catch(e){alert("Không thể tự lấy ván cờ từ link này.\n\nCách ổn định: mở ván cờ trên Chess.com → tải/xuất PGN → quay lại đây và chọn tệp PGN.\n\nChi tiết: "+e.message);setProgress(0,"Hãy nhập PGN thủ công hoặc tải tệp lên.");}
});
renderBoard();initEngine();
