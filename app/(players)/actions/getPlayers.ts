"use server";
import Player from "@/models/players/Player";
import { connectPlayerDb } from "@/lib/player-db";

export async function fetchPlayersAction(queryStr: string = "", page: number = 1) {
    const limit = 30;
    await connectPlayerDb();
    
    const query = queryStr ? { name: { $regex: queryStr, $options: "i" } } : {};
    
    const players = await Player.find(query)
        .sort({ "overall.max": -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    // Prevent serialization errors
    return players.map((p: any) => ({
        _id: p._id.toString(),
        efhubId: p.efhubId,
        name: p.name,
        club: p.club,
        teamId: p.teamId,
        league: p.league,
        positions: p.positions,
        overall: p.overall,
        images: p.images
    }));
}
