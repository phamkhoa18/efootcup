import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBxhTeam extends Document {
    _id: mongoose.Types.ObjectId;
    rank: number;
    clubName: string;
    leader: string;
    point: number;
    logo: string; // URL link or uploaded image path
    createdAt: Date;
    updatedAt: Date;
}

const BxhTeamSchema = new Schema<IBxhTeam>(
    {
        rank: {
            type: Number,
            required: [true, "Vui lòng nhập thứ hạng"],
            default: 0,
            index: true,
        },
        clubName: {
            type: String,
            required: [true, "Vui lòng nhập tên CLB"],
            trim: true,
        },
        leader: {
            type: String,
            required: [true, "Vui lòng nhập tên Leader"],
            trim: true,
        },
        point: {
            type: Number,
            required: [true, "Vui lòng nhập điểm"],
            default: 0,
            index: true,
        },
        logo: {
            type: String,
            trim: true,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

BxhTeamSchema.index({ point: -1, rank: 1 });

if (mongoose.models.BxhTeam) {
    delete mongoose.models.BxhTeam;
}

const BxhTeam: Model<IBxhTeam> = mongoose.model<IBxhTeam>("BxhTeam", BxhTeamSchema);

export default BxhTeam;
