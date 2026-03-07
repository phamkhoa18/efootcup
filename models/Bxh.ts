import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBxh extends Document {
    _id: mongoose.Types.ObjectId;
    gamerId: string;
    mode: "mobile" | "pc";
    name: string;
    facebook?: string;
    team?: string;
    nickname?: string;
    points: number;           // BXH Tổng = sum of all tier points for this mode
    // Mobile tier points
    pointsEfv250: number;
    pointsEfv500: number;
    pointsEfv1000: number;
    // PC tier points
    pointsEfv50: number;
    pointsEfv100: number;
    pointsEfv200: number;
    rank?: number;
    createdAt: Date;
    updatedAt: Date;
}

const BxhSchema = new Schema<IBxh>(
    {
        gamerId: {
            type: String,
            required: [true, "Vui lòng nhập ID"],
            trim: true,
        },
        mode: {
            type: String,
            enum: ["mobile", "pc"],
            default: "mobile",
            required: true,
        },
        name: {
            type: String,
            required: [true, "Vui lòng nhập họ tên"],
            trim: true,
        },
        facebook: {
            type: String,
            trim: true,
            default: "",
        },
        team: {
            type: String,
            trim: true,
            default: "",
        },
        nickname: {
            type: String,
            trim: true,
            default: "",
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

// Compound unique: 1 gamerId per mode
BxhSchema.index({ gamerId: 1, mode: 1 }, { unique: true });
BxhSchema.index({ mode: 1, points: -1 });

if (mongoose.models.Bxh) {
    delete mongoose.models.Bxh;
}

const Bxh: Model<IBxh> = mongoose.model<IBxh>("Bxh", BxhSchema);

export default Bxh;
