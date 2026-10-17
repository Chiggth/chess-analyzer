import { Chess } from "https://cdn.jsdelivr.net/npm/chess.js@1.4.0/+esm";

const $ = id => document.getElementById(id);
const PIECES = {wk:"♔",wq:"♕",wr:"♖",wb:"♗",wn:"♘",wp:"♙",bk:"♚",bq:"♛",br:"♜",bb:"♝",bn:"♞",bp:"♟"};
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
    const piece=grid[r][c];
    if(piece){const span=document.createElement("span");span.className="piece "+(piece.color==="w"?"white":"black");span.textContent=PIECES[piece.color+piece.type];sq.appendChild(span);}
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
function moveMark(quality){return ({"Brilliant":"!!","Best":"!","Excellent":"!","Good":"","Book":"","Inaccuracy":"?!","Mistake":"?","Blunder":"??","Tốt":"","Nước chưa tối ưu":"?!","Chưa chính xác":"?!","Sai lầm":"??"})[quality]??"";}
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
      const mark=moveMark(an?.quality);if(mark){const badge=document.createElement("span");badge.className="move-mark "+((mark==="??"||mark==="?")?"mark-bad":(mark==="?!")?"mark-warn":"mark-good");badge.textContent=mark;b.appendChild(badge);b.title=an?.quality||"Đang chờ phân tích";}
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
    analyses=[];currentPly=0;lastSquares=[];const headers=chess.getHeaders?.()||{};
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
    engine.postMessage("position fen "+fen);engine.postMessage("go depth "+depth);
  });
}
function classify(delta){
  if(delta<=-250)return "Sai lầm";
  if(delta<=-100)return "Chưa chính xác";
  if(delta<=-50)return "Nước chưa tối ưu";
  return "Tốt";
}
function feedbackFor(quality, san, bestSan, cp){
  if(!san)return "Vị trí ban đầu. Stockfish đang tìm nước đi tốt nhất.";
  if(quality==="Sai lầm")return `Sai lầm: ${san} làm thế cờ xấu đi đáng kể. Hãy so sánh với ${bestSan||"nước tốt nhất"} mà Stockfish đề xuất.`;
  if(quality==="Chưa chính xác")return `Chưa chính xác: ${san} khiến bạn mất một phần lợi thế. Có thể cân nhắc ${bestSan||"nước tốt nhất"}.`;
  if(quality==="Nước chưa tối ưu")return `Nước đi chơi được, nhưng ${bestSan||"một lựa chọn khác"} có thể giữ thế cờ tốt hơn.`;
  return `Nước ${san} không làm thay đổi lớn đánh giá ở độ sâu hiện tại. Tiếp tục kiểm tra các phương án chiến thuật.`;
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
      const res=await runPosition(positions[ply],10);
      // UCI score is relative to the side to move; convert to White's perspective.
      const sideToMove=positions[ply].split(" ")[1]||"w";
      const score=sideToMove==="w"?res.score:-res.score;
      let bestSan=res.best;
      try{const temp=new Chess(positions[ply]);const uci=res.best;if(uci&&uci!=="(none)"){const from=uci.slice(0,2),to=uci.slice(2,4),promotion=uci[4];const mv=temp.move({from,to,promotion});bestSan=mv?.san||uci;}}catch{}
      let quality="—", feedback="Vị trí ban đầu. Stockfish đang tìm nước đi tốt nhất.";
      if(ply>0){
        const moverWhite=(ply%2===1);
        const prev=analyses[ply-1]?.score??score;
        const delta=moverWhite?(score-prev):(prev-score);
        quality=classify(delta);
        feedback=feedbackFor(quality,moves[ply-1].san,bestSan,score);
      }
      analyses[ply]={score,bestMove:res.best,bestSan,depth:res.depth,quality,feedback};
      const pct=(ply+1)/(moves.length+1)*100;
      setProgress(pct,`Đang phân tích vị trí ${ply+1}/${moves.length+1} · độ sâu ${res.depth||10}`);
      if(ply===currentPly)renderBoard();
      if(ply>0)renderMoves();
    }
    setProgress(100,"Hoàn tất phân tích "+(moves.length+1)+" vị trí.");
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
