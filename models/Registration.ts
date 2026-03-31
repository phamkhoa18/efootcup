import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRegistration extends Document {
    _id: mongoose.Types.ObjectId;
    tournament: mongoose.Types.ObjectId;
    user?: mongoose.Types.ObjectId; // Optional — null if ghost player (no EFV ID linked)
    team?: mongoose.Types.ObjectId; // Assigned team after approval
    teamName: string;
    teamShortName: string;
    playerName: string;
    gamerId: string;
    phone: string;
    email: string;
    notes?: string;
    // Extended player info
    dateOfBirth?: string;
    facebookName?: string;
    facebookLink?: string;
    nickname?: string; // eFootball nickname
    province?: string; // Tỉnh thành hoặc Đất nước
    personalPhoto?: string; // Hình ảnh cá nhân (rõ mặt)
    teamLineupPhoto?: string; // Hình ảnh đội hình thẻ thi đấu
    // Player 2 (for 2v2+ tournaments)
    player2User?: mongoose.Types.ObjectId;
    player2Name?: string;
    player2GamerId?: string;
    player2Nickname?: string;
    player2Phone?: string;
    player2FacebookName?: string;
    player2FacebookLink?: string;
    status: "pending" | "approved" | "rejected" | "cancelled";
    rejectionReason?: string;
    // Payment fields
    paymentStatus: "unpaid" | "pending_verification" | "paid" | "refunded";
    paymentProof?: string;
    paymentAmount?: number;
    paymentMethod?: string; // momo, bank_transfer, zalopay, etc.
    paymentDate?: Date;
    paymentNote?: string; // Nội dung chuyển khoản
    paymentConfirmedBy?: mongoose.Types.ObjectId;
    paymentConfirmedAt?: Date;
    // Approval
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
            required: false,
            default: null,
        },
        team: {
            type: Schema.Types.ObjectId,
            ref: "Team",
        },
        teamName: {
            type: String,
            default: "",
            trim: true,
        },
        teamShortName: {
            type: String,
            default: "",
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
        // Extended player info
        dateOfBirth: { type: String, default: "" },
        facebookName: { type: String, default: "" },
        facebookLink: { type: String, default: "" },
        nickname: { type: String, default: "" },
        province: { type: String, default: "" },
        personalPhoto: { type: String, default: "" },
        teamLineupPhoto: { type: String, default: "" },
        // Player 2 (for 2v2+ tournaments)
        player2User: { type: Schema.Types.ObjectId, ref: "User" },
        player2Name: { type: String, default: "" },
        player2GamerId: { type: String, default: "" },
        player2Nickname: { type: String, default: "" },
        player2Phone: { type: String, default: "" },
        player2FacebookName: { type: String, default: "" },
        player2FacebookLink: { type: String, default: "" },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected", "cancelled"],
            default: "pending",
        },
        rejectionReason: { type: String },
        // Payment fields
        paymentStatus: {
            type: String,
            enum: ["unpaid", "pending_verification", "paid", "refunded"],
            default: "unpaid",
        },
        paymentProof: { type: String },
        paymentAmount: { type: Number, default: 0 },
        paymentMethod: { type: String, default: "" },
        paymentDate: { type: Date },
        paymentNote: { type: String, default: "" },
        paymentConfirmedBy: { type: Schema.Types.ObjectId, ref: "User" },
        paymentConfirmedAt: { type: Date },
        // Approval
        approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
        approvedAt: { type: Date },
    },
    {
        timestamps: true,
    }
);

// Prevent duplicate registration for linked users (skips null/undefined entirely via partialFilterExpression)
RegistrationSchema.index(
    { tournament: 1, user: 1 },
    { unique: true, partialFilterExpression: { user: { $type: "objectId" } } }
);
RegistrationSchema.index({ tournament: 1, status: 1 });

// Force re-register model to pick up schema changes in dev hot reload
if (process.env.NODE_ENV !== "production" && mongoose.models.Registration) {
    delete mongoose.models.Registration;
}

const Registration: Model<IRegistration> =
    mongoose.models.Registration ||
    mongoose.model<IRegistration>("Registration", RegistrationSchema);

export default Registration;
