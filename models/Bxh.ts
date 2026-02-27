import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBxh extends Document {
    _id: mongoose.Types.ObjectId;
    gamerId: string;
    name: string;
    facebook?: string;
    team?: string;
    nickname?: string;
    points: number;
    rank?: number;
    createdAt: Date;
    updatedAt: Date;
}

const BxhSchema = new Schema<IBxh>(
    {
        gamerId: {
            type: String,
            required: [true, "Vui lòng nhập ID"],
            unique: true, // Only one entry per gamerId in the global ranking
            trim: true,
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

BxhSchema.index({ points: -1 });

if (mongoose.models.Bxh) {
    delete mongoose.models.Bxh;
}

const Bxh: Model<IBxh> = mongoose.model<IBxh>("Bxh", BxhSchema);

export default Bxh;
