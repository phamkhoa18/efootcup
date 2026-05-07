import mongoose from "mongoose";

const MONGODB_PLAYER_URI = process.env.MONGODB_PLAYER_URI || "mongodb://localhost:27017/efootball_vn";

if (!MONGODB_PLAYER_URI) {
    throw new Error("Please define the MONGODB_PLAYER_URI environment variable inside .env.local");
}

interface MongooseConnectionCache {
    conn: mongoose.Connection | null;
}

declare global {
    // eslint-disable-next-line no-var
    var playerMongooseCache: MongooseConnectionCache | undefined;
}

const cached: MongooseConnectionCache = global.playerMongooseCache ?? { conn: null };
if (!global.playerMongooseCache) {
    global.playerMongooseCache = cached;
}

export function getPlayerDbConnection(): mongoose.Connection {
    if (cached.conn) {
        return cached.conn;
    }

    const opts = {
        bufferCommands: false,
    };
    
    // createConnection returns a Connection object synchronously. 
    const connection = mongoose.createConnection(MONGODB_PLAYER_URI, opts);
    
    connection.on('connected', () => {
        console.log("✅ Player Database (efootball_vn) connected successfully");
    });
    connection.on('error', (err) => {
        console.error("❌ Player Database connection error:", err);
    });

    cached.conn = connection;
    return connection;
}

// Hàm này để đợi kết nối chính thức hoàn tất trước khi thao tác DB khi bufferCommands = false
export async function connectPlayerDb(): Promise<mongoose.Connection> {
    const conn = getPlayerDbConnection();
    if (conn.readyState !== 1) { // 1 là connected
        await conn.asPromise();
    }
    return conn;
}
