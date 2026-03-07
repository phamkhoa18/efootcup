import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITournamentExpense extends Document {
    _id: mongoose.Types.ObjectId;
    tournament: mongoose.Types.ObjectId;
    label: string;
    amount: number;
    type: "income" | "expense";
    category: string; // prize, venue, sponsor, registration, marketing, operations, equipment, other
    notes?: string;
    date: Date;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const TournamentExpenseSchema = new Schema<ITournamentExpense>(
    {
        tournament: {
            type: Schema.Types.ObjectId,
            ref: "Tournament",
            required: true,
        },
        label: {
            type: String,
            required: [true, "Vui lòng nhập tên khoản thu/chi"],
            trim: true,
        },
        amount: {
            type: Number,
            required: [true, "Vui lòng nhập số tiền"],
            min: [0, "Số tiền phải lớn hơn 0"],
        },
        type: {
            type: String,
            enum: ["income", "expense"],
            required: true,
        },
        category: {
            type: String,
            enum: [
                "prize",         // Giải thưởng
                "venue",         // Thuê địa điểm
                "sponsor",       // Tài trợ
                "registration",  // Phí đăng ký
                "marketing",     // Truyền thông / Banner
                "operations",    // Vận hành / Trọng tài
                "equipment",     // Thiết bị
                "other",         // Khác
            ],
            default: "other",
        },
        notes: { type: String, default: "" },
        date: { type: Date, default: Date.now },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

TournamentExpenseSchema.index({ tournament: 1, type: 1 });
TournamentExpenseSchema.index({ tournament: 1, category: 1 });

const TournamentExpense: Model<ITournamentExpense> =
    mongoose.models.TournamentExpense ||
    mongoose.model<ITournamentExpense>("TournamentExpense", TournamentExpenseSchema);

export default TournamentExpense;
