import { useEffect, useMemo, useState } from "react";

/* ===== helpers ===== */
function clampInt(v, min, max){
  const x = Number.parseInt(String(v), 10);
  if (!Number.isFinite(x)) return min;
  return Math.min(max, Math.max(min, x));
}

function cleanTasks(text){
  return String(text || "")
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean);
}

/* ===== main ===== */
export default function Home(){
  /* ===== mode detection ===== */
  const params = useMemo(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);
  const playerIdFromUrl = useMemo(() => params.get("player") || "", [params]);

  const [mode, setMode] = useState(playerIdFromUrl ? "player" : "admin");

  /* ===== admin state ===== */
  const [n, setN] = useState(5);
  const [tasksText, setTasksText] = useState("");
  const [gameId, setGameId] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [playerLink, setPlayerLink] = useState("");

  /* ===== player state ===== */
  const [playerId, setPlayerId] = useState(playerIdFromUrl);
  const [game, setGame] = useState(null);
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(false);

  const need = game ? game.n * game.n : 0;

  /* ===== admin actions ===== */
  async function createGame(){
    const tasks = cleanTasks(tasksText);
    const needLocal = n * n;
    if (tasks.length < needLocal){
      alert(`Потрібно щонайменше ${needLocal} завдань (зараз: ${tasks.length}).`);
      return;
    }
    setLoading(true);
    try{
      const r = await fetch("/api/game-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ n, tasksText })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Помилка створення гри");
      setGameId(data.gameId);
      setPlayerLink("");
      alert(`Гру створено: ${data.gameId}`);
    }catch(e){
      alert(e.message || String(e));
    }finally{
      setLoading(false);
    }
  }

  async function createPlayer(){
    if (!gameId){
      alert("Спочатку створіть гру (gameId).");
      return;
    }
    if (!imageDataUrl){
      alert("Додайте картинку для цього гравця.");
      return;
    }
    setLoading(true);
    try{
      const r = await fetch("/api/player-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, imageDataUrl })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Помилка створення гравця");

      const url = new URL(window.location.href);
      url.searchParams.set("player", data.playerId);
      setPlayerLink(url.toString());
    }catch(e){
      alert(e.message || String(e));
    }finally{
      setLoading(false);
    }
  }

  /* ===== player actions ===== */
  async function loadPlayer(pid){
    setLoading(true);
    try{
      const r = await fetch(`/api/player-get?playerId=${encodeURIComponent(pid)}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Не вдалося завантажити");
      setGame(data.game);
      setPlayer(data.player);
    }catch(e){
      alert(e.message || String(e));
    }finally{
      setLoading(false);
    }
  }

  async function toggleCell(i){
  if (!playerId) return;

  try {
    const r = await fetch("/api/player-toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, index: i })
    });

    const data = await r.json();

    if (!r.ok) {
      throw new Error(data?.error || "Не вдалося оновити клітинку");
    }

    // після успішного оновлення на сервері підтягуємо актуальний стан
    await loadPlayer(playerId);

  } catch (e) {
    alert(e.message || String(e));
  }
}

  /* ===== auto-load & polling ===== */
  useEffect(() => {
    if (mode === "player" && playerId){
      loadPlayer(playerId);

      const t = setInterval(async () => {
        try{
          const r = await fetch(`/api/player-get?playerId=${encodeURIComponent(playerId)}`);
          const data = await r.json();
          if (r.ok){
            setGame(data.game);
            setPlayer(cur => {
              if (!cur) return data.player;
              return (data.player.updatedAt !== cur.updatedAt) ? data.player : cur;
            });
          }
        }catch{}
      }, 2000);

      return () => clearInterval(t);
    }
  }, [mode, playerId]);

  /* ===== image upload ===== */
  function onImageFile(e){
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")){
      alert("Це не зображення.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(String(reader.result));
    reader.readAsDataURL(file);
  }

  /* ===== styles ===== */
  const styles = {
    page: { fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial", padding: 16, maxWidth: 1100, margin: "0 auto" },
    card: { border: "1px solid rgba(0,0,0,.12)", borderRadius: 14, padding: 14, background: "#fff", boxShadow: "0 10px 30px rgba(0,0,0,.08)" },
    row: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" },
    input: { padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,.12)" },
    btn: { padding: "10px 12px", borderRadius: 12, border: 0, cursor: "pointer", background: "rgba(0,0,0,.06)", fontWeight: 650 },
    btnPrimary: { background: "#2b6cff", color: "#fff" },
    grid: (n) => ({ display: "grid", gridTemplateColumns: `repeat(${n}, 1fr)`, gap: 10, width: "min(760px, 100%)", aspectRatio: "1 / 1", marginTop: 14 }),
    cell: { border: "1px solid rgba(0,0,0,.12)", borderRadius: 16, overflow: "hidden", position: "relative", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 10, textAlign: "center", background: "#fff" },
    badge: { position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,.06)", padding: "6px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700 },
    hint: { color: "rgba(0,0,0,.6)", fontSize: 13, lineHeight: 1.35 }
  };

  /* ===== UI ===== */
  if (mode === "admin"){
    return (
      <div style={styles.page}>
        <div style={{...styles.card, marginBottom: 14}}>
          <h2>Адмін</h2>
          <p style={styles.hint}>
            Створіть гру (спільні завдання), потім — персональні лінки гравців з різними картинками.
          </p>
        </div>

        <div style={{...styles.card, marginBottom: 14}}>
          <div style={styles.row}>
            <label>Розмір N×N:</label>
            <input style={styles.input} type="number" min="2" max="10"
              value={n} onChange={e => setN(clampInt(e.target.value, 2, 10))} />
            <button style={{...styles.btn, ...styles.btnPrimary}} disabled={loading} onClick={createGame}>
              Create Game
            </button>
          </div>

          <div style={{marginTop: 10}}>
            <div style={styles.hint}>Завдання (по одному в рядку)</div>
            <textarea
              style={{...styles.input, width:"100%", minHeight:170}}
              value={tasksText}
              onChange={e => setTasksText(e.target.value)}
            />
          </div>

          <div style={{marginTop: 10, ...styles.hint}}>
            Game ID: <b>{gameId || "—"}</b>
          </div>
        </div>

        <div style={styles.card}>
          <h3>Персональний лінк гравця</h3>
          <div style={styles.row}>
            <input type="file" accept="image/*" onChange={onImageFile} />
            <button style={{...styles.btn, ...styles.btnPrimary}} disabled={loading} onClick={createPlayer}>
              Create Player Link
            </button>
          </div>

          {playerLink && (
  <div style={{marginTop:10}}>
    <div>
      <a href={playerLink} target="_blank">
        {playerLink}
      </a>
    </div>

    <div style={{marginTop:8}}>
      <a
        href={`https://t.me/share/url?url=${encodeURIComponent(playerLink)}`}
        target="_blank"
      >
        Share in Telegram
      </a>
    </div>
  </div>
)}

  /* ===== player UI ===== */
  return (
    <div style={styles.page}>
      <div style={{...styles.card, marginBottom: 14}}>
        <h2>Гравець</h2>
        <div style={{...styles.row, marginTop: 10}}>
          <label>Player ID:</label>
          <input
            style={{...styles.input, width: 320}}
            value={playerId}
            onChange={e => setPlayerId(e.target.value.trim())}
            placeholder="PLR_..."
          />
          <button
            style={{...styles.btn, ...styles.btnPrimary}}
            disabled={loading || !playerId}
            onClick={() => loadPlayer(playerId)}
          >
            Load
          </button>
        </div>
      </div>

      <div style={styles.card}>
        {!game || !player ? (
          <div style={styles.hint}>Завантажте дані гравця.</div>
        ) : (
          <>
            <div style={styles.hint}>
              Прогрес: <b>{player.done.filter(Boolean).length}</b> / <b>{need}</b>
            </div>

            <div style={styles.grid(game.n)}>
              {Array.from({ length: need }).map((_, i) => {
                const r = Math.floor(i / game.n);
                const c = i % game.n;
                const taskIndex = game.order[i];
                const text = game.tasks[taskIndex] ?? "(немає)";
                const done = !!player.done[i];

                const bgStyle = done && player.imageDataUrl ? {
                  backgroundImage: `url("${player.imageDataUrl}")`,
                  backgroundSize: `${game.n * 100}% ${game.n * 100}%`,
                  backgroundPosition: `${(c/(game.n-1))*100}% ${(r/(game.n-1))*100}%`,
                  backgroundRepeat: "no-repeat"
                } : null;

                return (
                  <div
                    key={i}
                    style={{...styles.cell, ...(bgStyle || {})}}
                    onClick={() => toggleCell(i)}
                  >
                    <div style={styles.badge}>{r+1}:{c+1}</div>
                    {!done && <div style={{fontWeight:650, fontSize:14, lineHeight:1.2}}>{text}</div>}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}