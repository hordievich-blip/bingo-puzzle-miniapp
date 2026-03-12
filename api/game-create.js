import { kv } from "@vercel/kv";

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

function makeId(prefix){
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
}

function shuffle(arr){
  for (let i = arr.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default async function handler(req, res){
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const name = String(req.body?.name || "").trim();
  const n = clampInt(req.body?.n ?? 5, 2, 10);
  const tasks = cleanTasks(req.body?.tasksText);
  const need = n * n;

  if (!name){
    return res.status(400).json({ error: "Вкажіть назву гри." });
  }

  if (tasks.length < need){
    return res.status(400).json({
      error: `Потрібно щонайменше ${need} завдань (зараз: ${tasks.length}).`
    });
  }

  const idx = shuffle([...Array(tasks.length).keys()]).slice(0, need);

  const gameId = makeId("GAME");
  const game = {
    gameId,
    name,
    n,
    tasks,
    order: idx,
    createdAt: Date.now()
  };

  await kv.set(`game:${gameId}`, game);

  return res.json({ gameId });
}