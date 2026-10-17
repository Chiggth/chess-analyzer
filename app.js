import { Chess } from "https://cdn.jsdelivr.net/npm/chess.js@1.4.0/+esm";

const $ = id => document.getElementById(id);
const PIECE_NAMES = { k: "Vua", q: "Hậu", r: "Xe", b: "Tượng", n: "Mã", p: "Tốt" };
const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

// Repertoire nhỏ được nhúng trong website; không phải cơ sở dữ liệu khai cuộc đầy đủ.
const BOOK_LINES = [
  { name: "Ruy Lopez", line: "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3" },
  { name: "Berlin Defense", line: "e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8" },
  { name: "Italian Game", line: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Nc3 Nxe4 O-O" },
  { name: "Scotch Game", line: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4" },
  { name: "Sicilian Defense", line: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6" },
  { name: "Sicilian Defense — Sveshnikov", line: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5" },
  { name: "Sicilian Defense — Kan", line: "e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6" },
  { name: "Sicilian Defense — Grand Prix", line: "e4 c5 Nc3 Nc6 f4 g6 Nf3 Bg7 Bb5" },
  { name: "French Defense", line: "e4 e6 d4 d5 Nc3 Nf6 e5 Nfd7 f4 c5 Nf3 Nc6" },
  { name: "French Defense — Advance", line: "e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6" },
  { name: "Caro-Kann Defense", line: "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6" },
  { name: "Caro-Kann — Advance", line: "e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2" },
  { name: "Queen's Gambit Declined", line: "d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3" },
  { name: "Queen's Gambit Declined", line: "d4 d5 c4 e6 Nf3 Nf6 Nc3 Be7" },
  { name: "King's Indian Defense", line: "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2" },
  { name: "Nimzo-Indian Defense", line: "d4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5" },
  { name: "Queen's Indian Defense", line: "d4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O" },
  { name: "Réti Opening", line: "Nf3 d5 g3 Nf6 Bg2 e6 O-O Be7 d3 O-O" },
  { name: "Bishop's Opening", line: "e4 e5 Bc4 Nf6 d3 Nc6 Nf3 Be7 O-O O-O" },
  { name: "King's Gambit", line: "e4 e5 f4 exf4 Nf3 g5 Bc4 g4 O-O gxf3 Qxf3 Qf6" },
  { name: "Scandinavian Defense", line: "e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6" },
  { name: "Catalan Opening", line: "d4 d5 Nf3 Nf6 c4 e6 g3 Be7 Bg2 O-O O-O" },
  { name: "Ruy Lopez — Marshall Attack", line: "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5" },
  { name: "Ruy Lopez — Exchange Variation", line: "e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6" },
  { name: "Ruy Lopez", line: "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4" },
  { name: "London System", line: "d4 d5 Bf4 Nf6 e3 e6 Nf3 c5 c3 Nc6" },
  { name: "English Opening", line: "c4 e5 Nc3 Nf6 g3 d5 cxd5 Nxd5" },
  { name: "Dutch Defense", line: "d4 f5 g3 Nf6 Bg2 e6 Nf3 Be7 O-O O-O" },
  { name: "Pirc Defense", line: "e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7" },
].map(o => ({ name: o.name, san: o.line.split(/\s+/).map(normalizeSan) }));

const PRESETS = {
  quick: { time: 300, multiPv: 1, hash: 16 },
  balanced: { time: 900, multiPv: 3, hash: 32 },
  deep: { time: 1500, multiPv: 3, hash: 32 },
  pro: { time: 2500, multiPv: 5, hash: 64 },
};

let chess = new Chess();
let moves = [];
let positions = [];
let analyses = [];
let currentPly = 0;
let engine = null;
let engineReady = false;
let analyzing = false;
let cancelRequested = false;
let readyResolvers = [];
let pendingSearch = null;
let lastSquares = [];

function normalizeSan(san) { return String(san || "").replace(/[+#?!]+$/g, ""); }
function setStatus(text, ready = false) {
  $("engineStatus").textContent = text;
  $("engineDot").parentElement.classList.toggle("ready", ready);
}
function getSettings() {
  return {
    time: Math.max(100, Number($("analysisTime").value) || 900),
    multiPv: Math.max(1, Math.min(5, Number($("analysisMultiPV").value) || 3)),
    hash: Math.max(16, Math.min(64, Number($("analysisHash").value) || 32)),
  };
}
function bookInfoForPly(ply) {
  if (ply < 1 || ply > 30) return null;
  const played = moves.slice(0, ply).map(m => normalizeSan(m.san));
  const matching = BOOK_LINES.filter(opening => opening.san.length >= ply && played.every((san, i) => opening.san[i] === san));
  if (!matching.length) return null;
  return matching[0].name;
}
function isBookPly(ply) { return Boolean(bookInfoForPly(ply)); }
function openingNameAtPly(ply) {
  if (ply < 1) return "—";
  const san = moves.slice(0, Math.min(ply, moves.length)).map(m => normalizeSan(m.san));
  if (san[0] === "e4" && san[1] === "c5") return "Sicilian Defense";
  if (san[0] === "e4" && san[1] === "e6") return "French Defense";
  if (san[0] === "e4" && san[1] === "c6") return "Caro-Kann Defense";
  if (san[0] === "e4" && san[1] === "d5") return "Scandinavian Defense";
  if (san[0] === "e4" && san[1] === "e5") {
    if (san[2] === "Nf3" && san[3] === "Nc6" && san[4] === "Bb5") return "Ruy Lopez";
    if (san[2] === "Nf3" && san[3] === "Nc6" && san[4] === "Bc4") return "Italian Game";
    if (san[2] === "Nf3" && san[3] === "Nc6" && san[4] === "d4") return "Scotch Game";
    if (san[2] === "f4") return "King's Gambit";
    return "Open Game";
  }
  if (san[0] === "d4" && san[1] === "d5" && san[2] === "c4") return "Queen's Gambit";
  if (san[0] === "d4" && san[1] === "Nf6" && san[2] === "c4") return "Indian Defense";
  if (san[0] === "c4") return "English Opening";
  if (san[0] === "Nf3") return "Réti Opening";
  return bookInfoForPly(ply) || "Chưa nhận diện";
}
function moveMark(quality) {
  return ({ "Brilliant": "‼", "Great Move": "!", "Best Move": "★", "Excellent": "👍", "Good": "✓", "Book": "▤", "Inaccuracy": "?!", "Mistake": "?", "Miss": "×", "Blunder": "??" })[quality] || "";
}
function annotationClass(quality) {
  const map = {
    "Brilliant": "annotation-brilliant", "Great Move": "annotation-great", "Best Move": "annotation-best",
    "Excellent": "annotation-excellent", "Good": "annotation-good", "Book": "annotation-book",
    "Inaccuracy": "annotation-inaccuracy", "Mistake": "annotation-mistake", "Miss": "annotation-miss", "Blunder": "annotation-blunder",
  };
  return map[quality] || "annotation-good";
}
function formatScore(cp, mate = null) {
  if (cp === null || cp === undefined || Number.isNaN(Number(cp))) return "—";
  if (Number.isFinite(mate)) return `${mate > 0 ? "+" : "−"}M${Math.abs(mate)}`;
  if (Math.abs(Number(cp)) > 9000) return Number(cp) > 0 ? "+M" : "−M";
  return `${Number(cp) > 0 ? "+" : ""}${(Number(cp) / 100).toFixed(1)}`;
}
function updateEvalBar(cp, mate = null) {
  const v = Math.max(-8, Math.min(8, Number(cp) || 0));
  const white = Math.max(4, Math.min(96, 50 + v / 16 * 50));
  $("evalWhite").style.height = white + "%";
  $("evalBlack").style.height = (100 - white) + "%";
  $("evalText").textContent = formatScore(cp, mate);
}
function renderBoard() {
  const board = $("board");
  board.innerHTML = "";
  const grid = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = document.createElement("div");
      sq.className = "square " + ((r + c) % 2 === 0 ? "light" : "dark");
      const file = "abcdefgh"[c], rank = 8 - r, name = file + rank;
      if (lastSquares.includes(name)) sq.classList.add("last");
      if (analyses[currentPly]?.bestFrom === name) sq.classList.add("best-from");
      if (analyses[currentPly]?.bestTo === name) sq.classList.add("best-to");
      const moveAnalysis = currentPly > 0 ? analyses[currentPly] : null;
      if (currentPly > 0 && moves[currentPly - 1]?.to === name && moveAnalysis?.quality && moveAnalysis.quality !== "—") {
        const marker = document.createElement("span");
        marker.className = "board-annotation " + annotationClass(moveAnalysis.quality);
        marker.textContent = moveMark(moveAnalysis.quality);
        marker.setAttribute("aria-label", moveAnalysis.quality);
        marker.title = `${moveAnalysis.quality}${Number.isFinite(moveAnalysis.cpl) ? ` · ${Math.round(moveAnalysis.cpl)} CPL` : ""}`;
        sq.appendChild(marker);
      }
      const piece = grid[r][c];
      if (piece) {
        const img = document.createElement("img");
        img.className = "piece-img " + (piece.color === "w" ? "white" : "black");
        img.src = `pieces/${piece.color}${piece.type}.png`;
        img.alt = `${PIECE_NAMES[piece.type]} ${piece.color === "w" ? "trắng" : "đen"}`;
        img.draggable = false;
        img.onerror = () => { img.classList.add("piece-missing"); img.alt = `${PIECE_NAMES[piece.type]} ${piece.color === "w" ? "trắng" : "đen"} (thiếu ảnh)`; };
        sq.appendChild(img);
      }
      if (c === 0 || r === 7) {
        const coord = document.createElement("span");
        coord.className = "coord";
        coord.textContent = c === 0 ? rank : file;
        sq.appendChild(coord);
      }
      board.appendChild(sq);
    }
  }
  $("moveCounter").textContent = currentPly === 0 ? "Vị trí ban đầu" : `Nước ${Math.ceil(currentPly / 2)} · ${currentPly % 2 ? "Trắng" : "Đen"}`;
  $("firstBtn").disabled = currentPly === 0;
  $("prevBtn").disabled = currentPly === 0;
  $("nextBtn").disabled = currentPly >= moves.length;
  $("lastBtn").disabled = currentPly >= moves.length;
  const a = analyses[currentPly];
  if (a) {
    $("score").textContent = formatScore(a.score, a.mate);
    $("feedback").textContent = a.feedback || "Đã đánh giá vị trí.";
    $("bestMove").textContent = a.bestSan || a.bestMove || "—";
    $("moveBadge").textContent = currentPly ? `${Math.ceil(currentPly / 2)}${currentPly % 2 ? "." : "..."}` : "Bắt đầu";
    $("cplValue").textContent = currentPly > 0 && Number.isFinite(a.cpl) ? `${Math.round(a.cpl)} cp` : "—";
    $("depthValue").textContent = a.depth ? `d${a.depth}` : "—";
    $("openingValue").textContent = currentPly ? (a.opening || "—") : "—";
    updateEvalBar(a.score, a.mate);
    renderCandidates(a);
  } else {
    $("score").textContent = "Chưa phân tích";
    $("feedback").textContent = currentPly ? "Chưa có kết quả cho vị trí này." : "Tải PGN rồi nhấn “Phân tích nâng cao”.";
    $("bestMove").textContent = "—";
    $("moveBadge").textContent = currentPly ? `Nước ${Math.ceil(currentPly / 2)}` : "—";
    $("cplValue").textContent = "—";
    $("depthValue").textContent = "—";
    $("openingValue").textContent = "—";
    renderCandidates(null);
  }
  document.querySelectorAll(".move-item").forEach(button => button.classList.toggle("active", Number(button.dataset.ply) === currentPly));
}
function renderCandidates(analysis) {
  const list = $("candidateList");
  list.innerHTML = "";
  const candidates = analysis?.candidates || [];
  $("candidateBadge").textContent = `MultiPV ${getSettings().multiPv}`;
  if (!candidates.length) {
    list.innerHTML = '<p class="empty">Sau khi phân tích, các biến ứng viên sẽ hiện tại đây.</p>';
    return;
  }
  for (const candidate of candidates) {
    const row = document.createElement("div");
    row.className = "candidate-row";
    const rank = document.createElement("span");
    rank.className = "candidate-rank";
    rank.textContent = `#${candidate.rank}`;
    const score = document.createElement("strong");
    score.className = "candidate-score";
    score.textContent = formatScore(candidate.score, candidate.mate);
    const line = document.createElement("div");
    line.className = "candidate-line";
    const first = document.createElement("strong");
    first.className = "candidate-first";
    first.textContent = candidate.firstSan || candidate.uci || "—";
    const pv = document.createElement("span");
    pv.className = "candidate-pv";
    pv.textContent = candidate.pvSan || "Chưa có biến chính";
    line.append(first, pv);
    const depth = document.createElement("span");
    depth.className = "candidate-depth";
    depth.textContent = `d${candidate.depth || analysis.depth || 0}`;
    row.append(rank, score, line, depth);
    list.appendChild(row);
  }
}
function renderMoves() {
  const list = $("movesList");
  list.innerHTML = "";
  if (!moves.length) {
    list.innerHTML = '<p class="empty">Tải PGN để xem các nước đi.</p>';
    return;
  }
  for (let i = 0; i < moves.length; i += 2) {
    const pair = document.createElement("div");
    pair.className = "move-pair";
    const number = document.createElement("span");
    number.className = "move-number";
    number.textContent = `${i / 2 + 1}.`;
    pair.appendChild(number);
    for (let j = i; j < Math.min(i + 2, moves.length); j++) {
      const button = document.createElement("button");
      button.className = "move-item";
      button.dataset.ply = j + 1;
      const analysis = analyses[j + 1];
      const san = document.createElement("span");
      san.className = "move-san";
      san.textContent = moves[j].san;
      button.appendChild(san);
      const mark = moveMark(analysis?.quality);
      if (mark) {
        const badge = document.createElement("span");
        badge.className = `move-mark ${annotationClass(analysis.quality)}`;
        badge.textContent = mark;
        button.appendChild(badge);
        button.title = `${analysis.quality}${Number.isFinite(analysis.cpl) ? ` · ${Math.round(analysis.cpl)} CPL` : ""}`;
        button.classList.add(annotationClass(analysis.quality));
      } else {
        button.title = "Chưa phân tích";
      }
      button.addEventListener("click", () => goTo(Number(button.dataset.ply)));
      pair.appendChild(button);
    }
    if (pair.children.length === 2) {
      const spacer = document.createElement("span");
      pair.appendChild(spacer);
    }
    list.appendChild(pair);
  }
}
function loadPgn(pgn) {
  if (analyzing) { alert("Hãy bấm Dừng hoặc chờ phân tích hiện tại kết thúc trước khi tải PGN khác."); return false; }
  try {
    const parsed = new Chess();
    parsed.loadPgn(pgn);
    chess = parsed;
    moves = chess.history({ verbose: true });
    positions = [new Chess().fen()];
    const replay = new Chess();
    for (const move of moves) { replay.move(move); positions.push(replay.fen()); }
    analyses = [];
    currentPly = 0;
    lastSquares = [];
    $("whiteMeta").textContent = "Độ chính xác — · Elo ước tính —";
    $("blackMeta").textContent = "Độ chính xác — · Elo ước tính —";
    $("whiteRating").textContent = "—";
    $("blackRating").textContent = "—";
    const headers = chess.getHeaders?.() || {};
    $("whiteName").textContent = headers.White || "Trắng";
    $("blackName").textContent = headers.Black || "Đen";
    $("gameResult").textContent = headers.Result && headers.Result !== "*" ? headers.Result : "PGN";
    renderMoves();
    goTo(0);
    setProgress(0, `Đã tải ${moves.length} nửa nước đi. Sẵn sàng phân tích.`);
    return true;
  } catch (error) {
    alert("Không đọc được PGN. Hãy kiểm tra nội dung tệp hoặc tải lại tệp PGN.\n\n" + error.message);
    return false;
  }
}
function goTo(ply) {
  currentPly = Math.max(0, Math.min(moves.length, ply));
  chess = new Chess();
  for (let i = 0; i < currentPly; i++) chess.move(moves[i]);
  const lastMove = moves[currentPly - 1];
  lastSquares = lastMove ? [lastMove.from, lastMove.to] : [];
  renderBoard();
  renderMoves();
}
function setProgress(percent, message) {
  $("progressBar").style.width = `${Math.max(0, Math.min(100, percent))}%`;
  $("progressText").textContent = message;
}

function initEngine() {
  if (engine) return;
  try {
    setStatus("Đang tải Stockfish…");
    engine = new Worker("engine/stockfish-19-lite-single.js");
    engine.onmessage = event => {
      const line = typeof event.data === "string" ? event.data : String(event.data);
      if (line === "uciok") {
        engine.postMessage("setoption name Threads value 1");
        engine.postMessage("setoption name Hash value 32");
        engine.postMessage("setoption name MultiPV value 1");
        engine.postMessage("isready");
        return;
      }
      if (line === "readyok") {
        engineReady = true;
        setStatus("Stockfish sẵn sàng", true);
        const resolvers = readyResolvers.splice(0);
        resolvers.forEach(resolve => resolve());
        return;
      }
      if (line.startsWith("info ") && pendingSearch) {
        const depth = Number(line.match(/\bdepth (\d+)/)?.[1] || 0);
        const multipv = Number(line.match(/\bmultipv (\d+)/)?.[1] || 1);
        const cpMatch = line.match(/\bscore cp (-?\d+)/);
        const mateMatch = line.match(/\bscore mate (-?\d+)/);
        const pvMatch = line.match(/\bpv (.+)$/);
        if (!depth || (!cpMatch && !mateMatch)) return;
        const prev = pendingSearch.lines[multipv];
        if (prev && prev.depth > depth) return;
        pendingSearch.lines[multipv] = {
          rank: multipv,
          depth,
          cp: cpMatch ? Number(cpMatch[1]) : null,
          mate: mateMatch ? Number(mateMatch[1]) : null,
          pvUci: pvMatch ? pvMatch[1].trim() : "",
        };
        pendingSearch.deepest = Math.max(pendingSearch.deepest || 0, depth);
        return;
      }
      if (line.startsWith("bestmove ") && pendingSearch) {
        const result = pendingSearch;
        pendingSearch = null;
        const best = line.split(/\s+/)[1];
        const lines = Object.values(result.lines).sort((a, b) => a.rank - b.rank);
        result.resolve({ best, lines, depth: result.deepest || 0, fen: result.fen });
      }
    };
    engine.onerror = () => {
      setStatus("Lỗi tải engine");
      setProgress(0, "Không tải được Stockfish. Kiểm tra engine/stockfish-19-lite-single.js và tệp WASM tương ứng.");
      if (pendingSearch) { const p = pendingSearch; pendingSearch = null; p.resolve({ best: "(none)", lines: [], depth: 0, fen: p.fen }); }
    };
    engine.postMessage("uci");
  } catch (error) {
    setStatus("Lỗi engine");
    setProgress(0, "Không thể khởi chạy Stockfish: " + error.message);
  }
}
function waitReady() {
  return new Promise(resolve => {
    readyResolvers.push(resolve);
    engine.postMessage("isready");
  });
}
function uciToSanLine(fen, uciLine) {
  if (!uciLine) return "";
  let temp;
  try { temp = new Chess(fen); } catch { return ""; }
  const san = [];
  for (const token of uciLine.trim().split(/\s+/)) {
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(token)) break;
    try {
      const move = temp.move({ from: token.slice(0, 2), to: token.slice(2, 4), promotion: token[4] });
      if (!move) break;
      san.push(move.san);
    } catch { break; }
  }
  return san.join(" ");
}
function scoreToWhite(raw, sideToMove) {
  return sideToMove === "w" ? raw : -raw;
}
function makeCandidates(result) {
  const sideToMove = result.fen.split(" ")[1] || "w";
  return result.lines.map(line => {
    const whiteMate = line.mate === null ? null : scoreToWhite(line.mate, sideToMove);
    const cpRaw = line.mate === null ? (line.cp ?? 0) : Math.sign(line.mate || 1) * (10000 - Math.min(99, Math.abs(line.mate)) * 10);
    const score = scoreToWhite(cpRaw, sideToMove);
    const uci = line.pvUci.split(/\s+/)[0] || result.best;
    return {
      rank: line.rank,
      depth: line.depth,
      uci,
      score,
      mate: whiteMate,
      pvSan: uciToSanLine(result.fen, line.pvUci),
      pvUci: line.pvUci,
    };
  });
}
function runPosition(fen, timeMs) {
  return new Promise(resolve => {
    if (pendingSearch) {
      resolve({ best: "(none)", lines: [], depth: 0, fen });
      return;
    }
    pendingSearch = { fen, lines: {}, deepest: 0, resolve };
    engine.postMessage("position fen " + fen);
    engine.postMessage("go movetime " + Math.max(100, timeMs));
  });
}
function sameUci(move, uci) {
  if (!move || !uci || uci === "(none)") return false;
  return move.from + move.to + (move.promotion || "") === uci.toLowerCase();
}
function materialOnBoard(chessPosition, color) {
  let total = 0;
  for (const row of chessPosition.board()) {
    for (const piece of row) if (piece && piece.color === color) total += PIECE_VALUE[piece.type] || 0;
  }
  return total;
}
function isPotentialBrilliant(ply, move, loss, afterAnalysis) {
  // Heuristic only: a quiet move offers a valuable piece to an engine capture
  // yet the evaluated position remains sound. This is not Chess.com's classifier.
  if (!move || !afterAnalysis || loss > 28 || move.flags.includes("c") || move.promotion) return false;
  const before = new Chess(positions[ply - 1]);
  const piece = before.get(move.from);
  if (!piece || piece.type === "p" || piece.type === "k") return false;
  if (!afterAnalysis.bestMove || afterAnalysis.bestMove === "(none)") return false;
  const after = new Chess(positions[ply]);
  const uci = afterAnalysis.bestMove;
  let reply;
  try { reply = after.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); } catch { return false; }
  if (!reply || !reply.flags.includes("c") || reply.to !== move.to) return false;
  const moverScore = piece.color === "w" ? afterAnalysis.score : -afterAnalysis.score;
  return moverScore > -100;
}
function classifyMove(ply, move, before, after, loss, isBest) {
  if (isBookPly(ply)) return "Book";
  const moverWhite = ply % 2 === 1;
  const beforeMoverScore = moverWhite ? before.score : -before.score;
  const afterMoverScore = moverWhite ? after.score : -after.score;
  if (isPotentialBrilliant(ply, move, loss, after)) return "Brilliant";
  if (isBest && loss <= 12 && (move.san.includes("+") || move.san.includes("#") || move.flags.includes("c")) && Math.abs(before.score) < 250) return "Great Move";
  if (isBest && loss <= 8) return "Best Move";
  if (loss <= 18) return "Excellent";
  if (loss <= 35) return "Good";
  if (beforeMoverScore >= 250 && loss >= 100 && afterMoverScore < 100) return "Miss";
  if (loss <= 70) return "Inaccuracy";
  if (loss <= 160) return "Mistake";
  return "Blunder";
}
function feedbackFor(quality, move, bestSan, cpl, opening) {
  const labels = {
    "Brilliant": "Brilliant (!!) — hy sinh có tính toán (ước lượng)", "Great Move": "Great Move (!) — nước đi nổi bật (ước lượng)",
    "Best Move": "Best Move (★) — trùng nước tốt nhất engine tìm được", "Excellent": "Excellent (👍) — rất tốt",
    "Good": "Good (✓) — tốt", "Book": "Book (▤) — thuộc biến khai cuộc đã nhận diện",
    "Inaccuracy": "Inaccuracy (?!) — chưa chính xác", "Mistake": "Mistake (?) — sai sót",
    "Miss": "Miss (×) — có thể đã bỏ lỡ lợi thế", "Blunder": "Blunder (??) — sai lầm lớn",
  };
  const parts = [`${labels[quality] || quality}: ${move?.san || "Vị trí ban đầu"}`];
  if (opening && quality === "Book") parts.push(`Khai cuộc: ${opening}.`);
  if (bestSan) parts.push(`Nước engine đề xuất ở vị trí trước đó: ${bestSan}.`);
  if (Number.isFinite(cpl)) parts.push(`Mất điểm ước tính: ${Math.round(cpl)} centipawn.`);
  return parts.join(" ");
}
function updatePlayerStats() {
  const losses = { w: [], b: [] };
  for (let ply = 1; ply < analyses.length; ply++) {
    const before = analyses[ply - 1], after = analyses[ply];
    if (!before || !after || !Number.isFinite(after.cpl)) continue;
    const mover = ply % 2 === 1 ? "w" : "b";
    losses[mover].push(after.cpl);
  }
  for (const side of ["w", "b"]) {
    const arr = losses[side];
    if (!arr.length) continue;
    // Transparent game-only approximation, not an official Chess.com formula.
    const average = arr.reduce((sum, value) => sum + value, 0) / arr.length;
    const moveAccuracy = arr.map(loss => 100 * Math.exp(-Math.max(0, loss) / 400));
    const accuracy = Math.max(1, Math.min(99, Math.round(moveAccuracy.reduce((a, b) => a + b, 0) / moveAccuracy.length)));
    const blunders = arr.filter(value => value >= 180).length;
    const estimatedElo = Math.max(400, Math.min(2600, Math.round((450 + accuracy * 18 - blunders * 35) / 50) * 50));
    const label = `${accuracy}% chính xác · Elo ước tính ~${estimatedElo}`;
    $(side === "w" ? "whiteMeta" : "blackMeta").textContent = label + (arr.length < 10 ? " · mẫu nhỏ" : "");
    $(side === "w" ? "whiteRating" : "blackRating").textContent = `${accuracy}%`;
  }
}
async function analyzeGame() {
  if (analyzing) return;
  if (!moves.length) { alert("Hãy tải PGN trước."); return; }
  initEngine();
  if (!engine) return;
  analyzing = true;
  cancelRequested = false;
  const settings = getSettings();
  $("analyzeBtn").disabled = true;
  $("analyzeBtn").textContent = "Đang phân tích…";
  $("stopBtn").disabled = false;
  try {
    await waitReady();
    engine.postMessage("setoption name Threads value 1");
    engine.postMessage(`setoption name Hash value ${settings.hash}`);
    engine.postMessage(`setoption name MultiPV value ${settings.multiPv}`);
    await waitReady();
    analyses = Array(moves.length + 1).fill(null);
    for (let ply = 0; ply <= moves.length; ply++) {
      if (cancelRequested) break;
      const result = await runPosition(positions[ply], settings.time);
      const candidates = makeCandidates(result);
      const top = candidates[0];
      const bestMove = top?.uci || result.best || "(none)";
      const bestSan = top?.pvSan?.split(/\s+/)[0] || uciToSanLine(positions[ply], bestMove).split(/\s+/)[0] || bestMove;
      const score = top?.score ?? 0;
      const mate = top?.mate ?? null;
      let quality = "—", cpl = null, feedback = "Vị trí ban đầu.";
      let opening = ply > 0 ? openingNameAtPly(ply) : "—";
      let bestFrom = null, bestTo = null;
      if (bestMove && /^[a-h][1-8][a-h][1-8]/.test(bestMove)) {
        bestFrom = bestMove.slice(0, 2);
        bestTo = bestMove.slice(2, 4);
      }
      if (ply > 0) {
        const before = analyses[ply - 1];
        const move = moves[ply - 1];
        const moverWhite = ply % 2 === 1;
        const beforeScore = before?.score ?? score;
        cpl = Math.max(0, moverWhite ? beforeScore - score : score - beforeScore);
        const isBest = sameUci(move, before?.bestMove);
        // Use MultiPV's direct comparison when the played move is among the candidate lines.
        const playedCandidate = before?.candidates?.find(candidate => sameUci(move, candidate.uci));
        if (playedCandidate && before?.candidates?.[0]) {
          const topScore = before.candidates[0].score;
          const candidateLoss = Math.max(0, moverWhite ? topScore - playedCandidate.score : playedCandidate.score - topScore);
          cpl = Math.max(cpl, candidateLoss);
        }
        quality = classifyMove(ply, move, before || { score }, { score, bestMove, mate, candidates }, cpl, isBest);
        feedback = feedbackFor(quality, move, before?.bestSan, cpl, opening);
      } else {
        feedback = "Đánh giá vị trí ban đầu. Các biến ứng viên được xếp hạng theo điểm engine.";
      }
      analyses[ply] = { score, mate, bestMove, bestSan, depth: result.depth || top?.depth || 0, candidates, quality, cpl, feedback, opening, bestFrom, bestTo };
      const progress = (ply + 1) / (moves.length + 1) * 100;
      setProgress(progress, `Đang phân tích ${ply + 1}/${moves.length + 1} vị trí · ${settings.time} ms/vị trí · MultiPV ${settings.multiPv} · độ sâu đạt ${result.depth || 0}`);
      if (ply === currentPly) renderBoard();
      renderMoves();
    }
    updatePlayerStats();
    goTo(currentPly);
    if (cancelRequested) setProgress(Math.round(analyses.filter(Boolean).length / (moves.length + 1) * 100), `Đã dừng. Giữ lại ${analyses.filter(Boolean).length} vị trí đã phân tích.`);
    else setProgress(100, `Hoàn tất ${moves.length + 1} vị trí · MultiPV ${settings.multiPv} · ${settings.time} ms/vị trí.`);
  } catch (error) {
    console.error(error);
    setProgress(0, "Có lỗi khi phân tích: " + error.message);
  } finally {
    analyzing = false;
    $("analyzeBtn").disabled = false;
    $("analyzeBtn").textContent = "Phân tích lại";
    $("stopBtn").disabled = true;
  }
}
function stopAnalysis() {
  if (!analyzing) return;
  cancelRequested = true;
  $("stopBtn").disabled = true;
  $("progressText").textContent = "Đang dừng sau khi Stockfish kết thúc vị trí hiện tại…";
  if (engine && pendingSearch) engine.postMessage("stop");
}
function setPreset(preset) {
  const config = PRESETS[preset];
  if (!config) return;
  $("analysisTime").value = String(config.time);
  $("analysisMultiPV").value = String(config.multiPv);
  $("analysisHash").value = String(config.hash);
  $("candidateBadge").textContent = `MultiPV ${config.multiPv}`;
}
$("analysisPreset").addEventListener("change", event => setPreset(event.target.value));
for (const id of ["analysisTime", "analysisMultiPV", "analysisHash"]) {
  $(id).addEventListener("change", () => {
    $("analysisPreset").value = "custom";
    $("candidateBadge").textContent = `MultiPV ${getSettings().multiPv}`;
    if (analyses[currentPly]) renderCandidates(analyses[currentPly]);
  });
}
$("loadPgnBtn").addEventListener("click", () => loadPgn($("pgnInput").value.trim()));
$("pgnFile").addEventListener("change", async event => {
  const file = event.target.files?.[0];
  if (file) { const text = await file.text(); $("pgnInput").value = text; loadPgn(text); }
});
$("firstBtn").addEventListener("click", () => goTo(0));
$("prevBtn").addEventListener("click", () => goTo(currentPly - 1));
$("nextBtn").addEventListener("click", () => goTo(currentPly + 1));
$("lastBtn").addEventListener("click", () => goTo(moves.length));
$("analyzeBtn").addEventListener("click", analyzeGame);
$("stopBtn").addEventListener("click", stopAnalysis);
$("urlBtn").addEventListener("click", async () => {
  const url = $("gameUrl").value.trim();
  if (!url) { alert("Dán link ván cờ Chess.com trước."); return; }
  if (!/https?:\/\/(www\.)?chess\.com\//i.test(url)) { alert("Vui lòng nhập đường dẫn thuộc chess.com."); return; }
  setProgress(0, "Đang thử lấy PGN từ đường dẫn…");
  try {
    const candidates = [url.replace(/\/+$/, "") + ".pgn", url.replace(/\/+$/, "") + "/pgn"];
    let success = false;
    for (const candidateUrl of candidates) {
      try {
        const response = await fetch(candidateUrl);
        if (!response.ok) continue;
        const text = await response.text();
        if (text.includes("[") && loadPgn(text)) { $("pgnInput").value = text; success = true; break; }
      } catch { /* CORS or cross-origin fetch can fail; use PGN upload. */ }
    }
    if (!success) throw new Error("Chess.com có thể chặn yêu cầu từ website khác hoặc link không phải đường dẫn PGN trực tiếp.");
    setProgress(0, "Đã nhập PGN từ link.");
  } catch (error) {
    alert("Không thể tự lấy ván cờ từ link này. Cách ổn định: xuất/tải PGN từ Chess.com, rồi chọn tệp PGN tại đây.\n\nChi tiết: " + error.message);
    setProgress(0, "Hãy nhập PGN thủ công hoặc tải tệp lên.");
  }
});
renderBoard();
initEngine();
