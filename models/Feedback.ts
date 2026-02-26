import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFeedback extends Document {
    _id: mongoose.Types.ObjectId;
    tournament: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    type: "suggestion" | "complaint" | "bug" | "praise" | "other";
    subject: string;
    message: string;
    rating?: number; // 1-5
    status: "new" | "read" | "replied" | "resolved";
    reply?: string;
    repliedBy?: mongoose.Types.ObjectId;
    repliedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
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
        type: {
            type: String,
            enum: ["suggestion", "complaint", "bug", "praise", "other"],
            default: "other",
        },
        subject: {
            type: String,
            required: [true, "Vui lòng nhập tiêu đề"],
            trim: true,
            maxlength: 200,
        },
        message: {
            type: String,
            required: [true, "Vui lòng nhập nội dung"],
            maxlength: 5000,
        },
        rating: {
            type: Number,
            min: 1,
            max: 5,
        },
        status: {
            type: String,
            enum: ["new", "read", "replied", "resolved"],
            default: "new",
        },
        reply: { type: String },
        repliedBy: { type: Schema.Types.ObjectId, ref: "User" },
        repliedAt: { type: Date },
    },
    {
        timestamps: true,
    }
);

FeedbackSchema.index({ tournament: 1 });
FeedbackSchema.index({ user: 1 });
FeedbackSchema.index({ status: 1 });

const Feedback: Model<IFeedback> =
    mongoose.models.Feedback ||
    mongoose.model<IFeedback>("Feedback", FeedbackSchema);

export default Feedback;
