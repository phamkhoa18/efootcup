import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRegistration extends Document {
    _id: mongoose.Types.ObjectId;
    tournament: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    team?: mongoose.Types.ObjectId; // Assigned team after approval
    teamName: string;
    teamShortName: string;
    playerName: string;
    gamerId: string;
    phone: string;
    email: string;
    notes?: string;
    status: "pending" | "approved" | "rejected" | "cancelled";
    rejectionReason?: string;
    paymentStatus: "unpaid" | "paid" | "refunded";
    paymentProof?: string;
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const RegistrationSchema = new Schema<IRegistration>(
    {
        tournament: {
            type: Schema.Types.ObjectId,
            ref: "Tournament",
            required: true,
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        team: {
            type: Schema.Types.ObjectId,
            ref: "Team",
        },
        teamName: {
            type: String,
            required: [true, "Vui lòng nhập tên đội"],
            trim: true,
        },
        teamShortName: {
            type: String,
            required: [true, "Vui lòng nhập tên viết tắt"],
            trim: true,
            uppercase: true,
            maxlength: 4,
        },
        playerName: {
            type: String,
            required: [true, "Vui lòng nhập tên người chơi"],
            trim: true,
        },
        gamerId: {
            type: String,
            required: [true, "Vui lòng nhập ID game"],
            trim: true,
        },
        phone: {
            type: String,
            required: [true, "Vui lòng nhập số điện thoại"],
        },
        email: {
            type: String,
            required: [true, "Vui lòng nhập email"],
        },
        notes: { type: String, default: "" },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected", "cancelled"],
            default: "pending",
        },
        rejectionReason: { type: String },
        paymentStatus: {
            type: String,
            enum: ["unpaid", "paid", "refunded"],
            default: "unpaid",
        },
        paymentProof: { type: String },
        approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
        approvedAt: { type: Date },
    },
    {
        timestamps: true,
    }
);

// Prevent duplicate registration
RegistrationSchema.index({ tournament: 1, user: 1 }, { unique: true });
RegistrationSchema.index({ tournament: 1, status: 1 });

const Registration: Model<IRegistration> =
    mongoose.models.Registration ||
    mongoose.model<IRegistration>("Registration", RegistrationSchema);

export default Registration;
