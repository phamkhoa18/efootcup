import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEfvPointLog extends Document {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;           // VĐV (ref User)
    tournament: mongoose.Types.ObjectId;     // Giải đấu (ref Tournament)
    mode: "mobile" | "pc";                   // Chế độ giải
    efvTier: "efv_250" | "efv_500" | "efv_1000"; // Hạng giải
    placement: string;                       // "champion" | "runner_up" | "top_4" | ...
    points: number;                          // Số điểm nhận được
    teamName: string;                        // Tên đội/VĐV tại thời điểm giải
    tournamentTitle: string;                 // Tên giải (cached for display)
    awardedAt: Date;                         // Ngày trao điểm (dùng để sort sliding window)
    createdAt: Date;
    updatedAt: Date;
}

const EfvPointLogSchema = new Schema<IEfvPointLog>(
    {
        user: {
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
            enum: ["efv_250", "efv_500", "efv_1000"],
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

// Unique: 1 user chỉ được cộng điểm 1 lần per tournament
EfvPointLogSchema.index({ user: 1, tournament: 1 }, { unique: true });

// Query BXH: sort by awardedAt để lấy top 5 gần nhất
EfvPointLogSchema.index({ user: 1, mode: 1, awardedAt: -1 });

// Aggregate BXH: tìm tất cả user có điểm
EfvPointLogSchema.index({ mode: 1, awardedAt: -1 });

const EfvPointLog: Model<IEfvPointLog> =
    mongoose.models.EfvPointLog ||
    mongoose.model<IEfvPointLog>("EfvPointLog", EfvPointLogSchema);

export default EfvPointLog;
