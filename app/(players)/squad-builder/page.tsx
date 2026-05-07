import Player from "@/models/players/Player";
import { connectPlayerDb } from "@/lib/player-db";
import SquadBuilderClient from "./components/SquadBuilderClient";

export default async function SquadBuilderPage() {
    await connectPlayerDb();
    
    // Fetch a large pool of real players for the interactive builder
    // Client will filter this array dynamically.
    const initialPlayers = await Player.find()
        .sort({ "overall.max": -1 })
        .limit(300)
        .lean();

    // Serialize object ids
    const serialized = initialPlayers.map((p: any) => ({
        ...p,
        _id: p._id.toString()
    }));

    return <SquadBuilderClient initialPlayers={serialized} />;
}
