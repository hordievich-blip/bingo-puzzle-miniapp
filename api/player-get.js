import { kv } from "@vercel/kv";

export default async function handler(req, res){
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const playerId = String(req.query?.playerId || "");
  if (!playerId) return res.status(400).json({ error: "playerId required" });

  const player = await kv.get(`player:${playerId}`);
  if (!player) return res.status(404).json({ error: "Player not found" });

  const game = await kv.get(`game:${player.gameId}`);
  if (!game) return res.status(404).json({ error: "Game not found" });

  return res.json({ player, game });
}