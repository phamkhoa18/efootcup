import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMatchAuditLog extends Document {
    _id: mongoose.Types.ObjectId;
    match: mongoose.Types.ObjectId;
    tournament: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    action: "update_score" | "change_status" | "reset_match" | "update_schedule" | "update_events" | "update_notes" | "update_penalty" | "create_match";
    changes: {
        field: string;
        oldValue: any;
        newValue: any;
    }[];
    summary: string; // Human-readable summary in Vietnamese
    metadata?: {
        matchNumber?: number;
        roundName?: string;
        homeTeamName?: string;
        awayTeamName?: string;
    };
    ipAddress?: string;
    createdAt: Date;
}

const MatchAuditLogSchema = new Schema<IMatchAuditLog>(
    {
        match: {
            type: Schema.Types.ObjectId,
            ref: "Match",
            required: true,
            index: true,
        },
        tournament: {
            type: Schema.Types.ObjectId,
            ref: "Tournament",
            required: true,
            index: true,
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        action: {
            type: String,
            enum: [
                "update_score",
                "change_status",
                "reset_match",
                "update_schedule",
                "update_events",
                "update_notes",
                "update_penalty",
                "create_match",
            ],
            required: true,
        },
        changes: [
            {
                field: { type: String, required: true },
                oldValue: { type: Schema.Types.Mixed },
                newValue: { type: Schema.Types.Mixed },
            },
        ],
        summary: {
            type: String,
            required: true,
            maxlength: 500,
        },
        metadata: {
            matchNumber: { type: Number },
            roundName: { type: String },
            homeTeamName: { type: String },
            awayTeamName: { type: String },
        },
        ipAddress: { type: String },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

// Compound indexes for common queries
MatchAuditLogSchema.index({ tournament: 1, createdAt: -1 });
MatchAuditLogSchema.index({ match: 1, createdAt: -1 });
MatchAuditLogSchema.index({ user: 1, tournament: 1, createdAt: -1 });

const MatchAuditLog: Model<IMatchAuditLog> =
    mongoose.models.MatchAuditLog ||
    mongoose.model<IMatchAuditLog>("MatchAuditLog", MatchAuditLogSchema);

export default MatchAuditLog;
