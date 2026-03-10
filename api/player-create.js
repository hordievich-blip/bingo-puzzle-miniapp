import { kv } from "@vercel/kv";

function makeId(prefix){
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
}

export default async function handler(req, res){
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const gameId = String(req.body?.gameId || "");
  const imageDataUrl = typeof req.body?.imageDataUrl === "string" ? req.body.imageDataUrl : null;

  if (!gameId) return res.status(400).json({ error: "gameId required" });
  const game = await kv.get(`game:${gameId}`);
  if (!game) return res.status(404).json({ error: "Game not found" });

  const need = game.n * game.n;
  const playerId = makeId("PLR");

  const player = {
    playerId,
    gameId,
    imageDataUrl,
    done: Array(need).fill(false),
    updatedAt: Date.now()
  };

  await kv.set(`player:${playerId}`, player);
  return res.json({ playerId });
}