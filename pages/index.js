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
  const adminKeyFromUrl = useMemo(() => params.get("admin") || "", [params]);

  const [mode, setMode] = useState(playerIdFromUrl ? "player" : "admin");

  /* ===== admin state ===== */
  const [n, setN] = useState(5);
  const [gameName, setGameName] = useState("");
  const [tasksText, setTasksText] = useState("");
  const [gameId, setGameId] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [playerLink, setPlayerLink] = useState("");
  const [adminLink, setAdminLink] = useState("");

  /* ===== player state ===== */
  const [playerId, setPlayerId] = useState(playerIdFromUrl);
  const [adminKey, setAdminKey] = useState(adminKeyFromUrl);
  const [game, setGame] = useState(null);
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(false);

  const need = game ? game.n * game.n : 0;

  /* ===== admin actions ===== */
  async function createGame(){
    const tasks = cleanTasks(tasksText);
    const needLocal = n * n;

    if (!gameName.trim()){
      alert("Вкажіть назву гри.");
      return;
    }

    if (tasks.length < needLocal){
      alert(`Потрібно щонайменше ${needLocal} завдань (зараз: ${tasks.length}).`);
      return;
    }

    setLoading(true);

    try{
      const r = await fetch("/api/game-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: gameName,
          n,
          tasksText
        })
      });

      const data = await r.json();

      if (!r.ok) {
        throw new Error(data?.error || "Помилка створення гри");
      }

      setGameId(data.gameId);
      setPlayerLink("");
      setAdminLink("");

      alert(`Гру створено: ${data.gameId}`);
    } catch (e){
      alert(e.message || String(e));
    } finally {
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

      if (!r.ok) {
        throw new Error(data?.error || "Помилка створення гравця");
      }

      const baseUrl = `${window.location.origin}${window.location.pathname}`;

      const viewerUrl = new URL(baseUrl);
      viewerUrl.searchParams.set("player", data.playerId);

      const adminUrl = new URL(baseUrl);
      adminUrl.searchParams.set("player", data.playerId);
      adminUrl.searchParams.set("admin", data.adminKey);

      setPlayerLink(viewerUrl.toString());
      setAdminLink(adminUrl.toString());
    } catch (e){
      alert(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  /* ===== player actions ===== */
  async function loadPlayer(pid){
    setLoading(true);

    try{
      const r = await fetch(`/api/player-get?playerId=${encodeURIComponent(pid)}`);
      const data = await r.json();

      if (!r.ok) {
        throw new Error(data?.error || "Не вдалося завантажити");
      }

      setGame(data.game);
      setPlayer(data.player);
    } catch (e){
      alert(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function toggleCell(i){
    if (!playerId || !adminKey) return;

    try {
      const r = await fetch("/api/player-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          adminKey,
          index: i
        })
      });

      const data = await r.json();

      if (!r.ok) {
        throw new Error(data?.error || "Не вдалося оновити клітинку");
      }

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
        } catch {}
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
    page: {
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      padding: 16,
      maxWidth: 1100,
      margin: "0 auto"
    },
    card: {
      border: "1px solid rgba(0,0,0,.12)",
      borderRadius: 14,
      padding: 14,
      background: "#fff",
      boxShadow: "0 10px 30px rgba(0,0,0,.08)"
    },
    row: {
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
      alignItems: "center"
    },
    input: {
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid rgba(0,0,0,.12)"
    },
    btn: {
      padding: "10px 12px",
      borderRadius: 12,
      border: 0,
      cursor: "pointer",
      background: "rgba(0,0,0,.06)",
      fontWeight: 650
    },
    btnPrimary: {
      background: "#2b6cff",
      color: "#fff"
    },
    grid: (size) => ({
      display: "grid",
      gridTemplateColumns: `repeat(${size}, 1fr)`,
      gap: 10,
      width: "min(760px, 100%)",
      aspectRatio: "1 / 1",
      marginTop: 14
    }),
    cell: {
      border: "1px solid rgba(0,0,0,.12)",
      borderRadius: 16,
      overflow: "hidden",
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 10,
      textAlign: "center",
      background: "#fff"
    },
    hint: {
      color: "rgba(0,0,0,.6)",
      fontSize: 13,
      lineHeight: 1.35
    }
  };

  /* ===== UI ===== */
  if (mode === "admin"){
    return (
      <div style={styles.page}>
        <div style={{ ...styles.card, marginBottom: 14 }}>
          <h2>Адмін</h2>
          <p style={styles.hint}>
            Створіть гру зі спільними завданнями, задайте їй назву, а потім створіть окремого гравця з персональною картинкою.
          </p>
        </div>

        <div style={{ ...styles.card, marginBottom: 14 }}>
          <div style={{ marginBottom: 10 }}>
            <div style={styles.hint}>Назва гри</div>
            <input
              style={{ ...styles.input, width: "100%" }}
              type="text"
              value={gameName}
              onChange={e => setGameName(e.target.value)}
              placeholder="Наприклад: Великоднє бінго"
            />
          </div>

          <div style={styles.row}>
            <label>Розмір N×N:</label>
            <input
              style={styles.input}
              type="number"
              min="2"
              max="10"
              value={n}
              onChange={e => setN(clampInt(e.target.value, 2, 10))}
            />
            <button
              style={{ ...styles.btn, ...styles.btnPrimary }}
              disabled={loading}
              onClick={createGame}
            >
              Create Game
            </button>
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={styles.hint}>Завдання (по одному в рядку)</div>
            <textarea
              style={{ ...styles.input, width: "100%", minHeight: 170 }}
              value={tasksText}
              onChange={e => setTasksText(e.target.value)}
            />
          </div>

          <div style={{ marginTop: 10, ...styles.hint }}>
            Game ID: <b>{gameId || "—"}</b>
          </div>
        </div>

        <div style={styles.card}>
          <h3>Створити гравця</h3>

          <div style={styles.row}>
            <input type="file" accept="image/*" onChange={onImageFile} />
            <button
              style={{ ...styles.btn, ...styles.btnPrimary }}
              disabled={loading}
              onClick={createPlayer}
            >
              Create Player Link
            </button>
          </div>

          {playerLink && (
            <div style={{ marginTop: 12 }}>
              <div style={styles.hint}>Лінк для гравця (тільки перегляд):</div>
              <input
                style={{ ...styles.input, width: "100%", marginBottom: 10 }}
                value={playerLink}
                readOnly
                onFocus={e => e.target.select()}
              />

              <div style={styles.hint}>Лінк для адміна (можна відмічати прогрес):</div>
              <input
                style={{ ...styles.input, width: "100%" }}
                value={adminLink}
                readOnly
                onFocus={e => e.target.select()}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ===== player UI ===== */
  return (
    <div style={styles.page}>
      <div style={{ ...styles.card, marginBottom: 14 }}>
        <h2>{adminKey ? "Адмінський перегляд гравця" : "Гравець"}</h2>

        <div style={{ ...styles.row, marginTop: 10 }}>
          <label>Player ID:</label>
          <input
            style={{ ...styles.input, width: 320 }}
            value={playerId}
            onChange={e => setPlayerId(e.target.value.trim())}
            placeholder="PLR_..."
          />
          <button
            style={{ ...styles.btn, ...styles.btnPrimary }}
            disabled={loading || !playerId}
            onClick={() => loadPlayer(playerId)}
          >
            Load
          </button>
        </div>

        {!adminKey && (
          <div style={{ marginTop: 10, ...styles.hint }}>
            У цьому режимі доступний тільки перегляд прогресу.
          </div>
        )}

        {adminKey && (
          <div style={{ marginTop: 10, ...styles.hint }}>
            У цьому режимі можна відмічати виконані завдання.
          </div>
        )}
      </div>

      <div style={styles.card}>
        {!game || !player ? (
          <div style={styles.hint}>Завантажте дані гравця.</div>
        ) : (
          <>
            <div style={{ marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>{game.name || "Без назви"}</h3>
            </div>

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
                  backgroundPosition: `${(c / (game.n - 1)) * 100}% ${(r / (game.n - 1)) * 100}%`,
                  backgroundRepeat: "no-repeat"
                } : null;

                return (
                  <div
                    key={i}
                    style={{
                      ...styles.cell,
                      ...(bgStyle || {}),
                      cursor: adminKey ? "pointer" : "default"
                    }}
                    onClick={() => adminKey && toggleCell(i)}
                  >
                    {!done && (
                      <div style={{ fontWeight: 650, fontSize: 14, lineHeight: 1.2 }}>
                        {text}
                      </div>
                    )}
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