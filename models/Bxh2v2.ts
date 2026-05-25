import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBxh2v2 extends Document {
    _id: mongoose.Types.ObjectId;
    teamHash: string; // "userId1_userId2"
    mode: "mobile" | "pc";
    teamName: string;
    
    // Cache player info to display on leaderboard
    player1: {
        userId: mongoose.Types.ObjectId;
        gamerId: string;
        name: string;
        nickname?: string;
        avatar?: string;
        facebook?: string;
    };
    player2: {
        userId: mongoose.Types.ObjectId;
        gamerId: string;
        name: string;
        nickname?: string;
        avatar?: string;
        facebook?: string;
    };
    
    points: number;           // BXH Tổng
    pointsEfv250: number;
    pointsEfv500: number;
    pointsEfv1000: number;
    pointsEfv50: number;
    pointsEfv100: number;
    pointsEfv200: number;
    rank?: number;
    createdAt: Date;
    updatedAt: Date;
}

const PlayerInfoSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    gamerId: { type: String, default: "" },
    name: { type: String, required: true },
    nickname: { type: String, default: "" },
    avatar: { type: String, default: "" },
    facebook: { type: String, default: "" },
}, { _id: false });

const Bxh2v2Schema = new Schema<IBxh2v2>(
    {
        teamHash: {
            type: String,
            required: [true, "Vui lòng cung cấp teamHash"],
            trim: true,
        },
        mode: {
            type: String,
            enum: ["mobile", "pc"],
            default: "mobile",
            required: true,
        },
        teamName: {
            type: String,
            trim: true,
            default: "",
        },
        player1: {
            type: PlayerInfoSchema,
            required: true,
        },
        player2: {
            type: PlayerInfoSchema,
            required: true,
        },
        points: {
            type: Number,
            required: [true, "Vui lòng nhập điểm số"],
            default: 0,
            index: true,
        },
        // Mobile
        pointsEfv250: { type: Number, default: 0 },
        pointsEfv500: { type: Number, default: 0 },
        pointsEfv1000: { type: Number, default: 0 },
        // PC
        pointsEfv50: { type: Number, default: 0 },
        pointsEfv100: { type: Number, default: 0 },
        pointsEfv200: { type: Number, default: 0 },
        rank: {
            type: Number,
            default: null,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound unique: 1 teamHash per mode
Bxh2v2Schema.index({ teamHash: 1, mode: 1 }, { unique: true });
Bxh2v2Schema.index({ mode: 1, points: -1 });

if (mongoose.models.Bxh2v2) {
    delete mongoose.models.Bxh2v2;
}

const Bxh2v2: Model<IBxh2v2> = mongoose.model<IBxh2v2>("Bxh2v2", Bxh2v2Schema);

export default Bxh2v2;
