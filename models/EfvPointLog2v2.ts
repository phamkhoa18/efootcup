import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEfvPointLog2v2 extends Document {
    _id: mongoose.Types.ObjectId;
    teamHash: string;                        // Unique identifier for the pair: "userId1_userId2" (sorted alphabetically)
    player1: mongoose.Types.ObjectId;        // VĐV 1 (ref User)
    player2: mongoose.Types.ObjectId;        // VĐV 2 (ref User)
    tournament: mongoose.Types.ObjectId;     // Giải đấu (ref Tournament)
    mode: "mobile" | "pc";                   // Chế độ giải
    efvTier: "efv_250" | "efv_500" | "efv_1000" | "efv_50" | "efv_100" | "efv_200"; // Hạng giải
    placement: string;                       // "champion" | "runner_up" | "top_4" | ...
    points: number;                          // Số điểm nhận được
    teamName: string;                        // Tên đội tại thời điểm giải
    tournamentTitle: string;                 // Tên giải (cached for display)
    awardedAt: Date;                         // Ngày trao điểm (dùng để sort sliding window)
    createdAt: Date;
    updatedAt: Date;
}

const EfvPointLog2v2Schema = new Schema<IEfvPointLog2v2>(
    {
        teamHash: {
            type: String,
            required: true,
            index: true,
        },
        player1: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        player2: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        tournament: {
            type: Schema.Types.ObjectId,
            ref: "Tournament",
            required: true,
        },
        mode: {
            type: String,
            enum: ["mobile", "pc"],
            required: true,
        },
        efvTier: {
            type: String,
            enum: ["efv_250", "efv_500", "efv_1000", "efv_50", "efv_100", "efv_200"],
            required: true,
        },
        placement: {
            type: String,
            required: true,
        },
        points: {
            type: Number,
            required: true,
            min: 0,
        },
        teamName: {
            type: String,
            default: "",
        },
        tournamentTitle: {
            type: String,
            default: "",
        },
        awardedAt: {
            type: Date,
            required: true,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Unique: 1 cặp VĐV chỉ được cộng điểm 1 lần per tournament
EfvPointLog2v2Schema.index({ teamHash: 1, tournament: 1 }, { unique: true });

// Query BXH: sort by awardedAt để lấy top N giải gần nhất per tier cho cặp VĐV
EfvPointLog2v2Schema.index({ teamHash: 1, mode: 1, awardedAt: -1 });
EfvPointLog2v2Schema.index({ teamHash: 1, efvTier: 1, awardedAt: -1 });

if (mongoose.models.EfvPointLog2v2) {
    delete mongoose.models.EfvPointLog2v2;
}

const EfvPointLog2v2: Model<IEfvPointLog2v2> = mongoose.model<IEfvPointLog2v2>("EfvPointLog2v2", EfvPointLog2v2Schema);

export default EfvPointLog2v2;
