import { kv } from "@vercel/kv";

export default async function handler(req, res){
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const playerId = String(req.body?.playerId || "");
  const adminKey = String(req.body?.adminKey || "");
  const index = Number(req.body?.index);

  if (!playerId) return res.status(400).json({ error: "playerId required" });

  const player = await kv.get(`player:${playerId}`);
  if (!player) return res.status(404).json({ error: "Player not found" });

  if (!adminKey || adminKey !== player.adminKey) {
    return res.status(403).json({ error: "Only admin can update progress" });
  }

  const game = await kv.get(`game:${player.gameId}`);
  if (!game) return res.status(404).json({ error: "Game not found" });

  const need = game.n * game.n;
  if (!Number.isInteger(index) || index < 0 || index >= need){
    return res.status(400).json({ error: "Bad index" });
  }

  player.done[index] = !player.done[index];
  player.updatedAt = Date.now();

  await kv.set(`player:${playerId}`, player);

  return res.json({ ok: true, updatedAt: player.updatedAt });
}