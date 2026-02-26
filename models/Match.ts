import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMatch extends Document {
    _id: mongoose.Types.ObjectId;
    tournament: mongoose.Types.ObjectId;
    round: number; // Round number (1, 2, 3... for elimination; match day for round robin)
    roundName: string; // "Vòng 1", "Tứ kết", "Bán kết", "Chung kết"
    matchNumber: number; // Order in bracket
    group?: string; // Group name if group stage
    homeTeam: mongoose.Types.ObjectId | null;
    awayTeam: mongoose.Types.ObjectId | null;
    homeScore: number | null;
    awayScore: number | null;
    homePenalty?: number; // Penalty shootout
    awayPenalty?: number;
    homeExtraTime?: number;
    awayExtraTime?: number;
    winner: mongoose.Types.ObjectId | null;
    status: "scheduled" | "live" | "completed" | "postponed" | "cancelled" | "walkover";
    scheduledAt?: Date;
    startedAt?: Date;
    completedAt?: Date;
    leg: number; // 1 or 2 (for two-legged ties)
    venue?: string;
    referee?: mongoose.Types.ObjectId;
    events: {
        minute: number;
        type: "goal" | "own_goal" | "penalty_goal" | "penalty_miss" | "yellow_card" | "red_card" | "substitution" | "injury";
        team: mongoose.Types.ObjectId;
        player?: string;
        assistPlayer?: string;
        description?: string;
    }[];
    notes?: string;
    screenshots?: string[];
    nextMatch?: mongoose.Types.ObjectId; // Winner goes to this match
    previousMatches?: mongoose.Types.ObjectId[]; // Matches that feed into this
    bracketPosition: {
        x: number;
        y: number;
    };
    createdAt: Date;
    updatedAt: Date;
}

const MatchSchema = new Schema<IMatch>(
    {
        tournament: {
            type: Schema.Types.ObjectId,
            ref: "Tournament",
            required: true,
        },
        round: { type: Number, required: true },
        roundName: { type: String, default: "" },
        matchNumber: { type: Number, required: true },
        group: { type: String },
        homeTeam: { type: Schema.Types.ObjectId, ref: "Team", default: null },
        awayTeam: { type: Schema.Types.ObjectId, ref: "Team", default: null },
        homeScore: { type: Number, default: null },
        awayScore: { type: Number, default: null },
        homePenalty: { type: Number },
        awayPenalty: { type: Number },
        homeExtraTime: { type: Number },
        awayExtraTime: { type: Number },
        winner: { type: Schema.Types.ObjectId, ref: "Team", default: null },
        status: {
            type: String,
            enum: ["scheduled", "live", "completed", "postponed", "cancelled", "walkover"],
            default: "scheduled",
        },
        scheduledAt: { type: Date },
        startedAt: { type: Date },
        completedAt: { type: Date },
        leg: { type: Number, default: 1 },
        venue: { type: String },
        referee: { type: Schema.Types.ObjectId, ref: "User" },
        events: [
            {
                minute: { type: Number, required: true },
                type: {
                    type: String,
                    enum: [
                        "goal",
                        "own_goal",
                        "penalty_goal",
                        "penalty_miss",
                        "yellow_card",
                        "red_card",
                        "substitution",
                        "injury",
                    ],
                    required: true,
                },
                team: { type: Schema.Types.ObjectId, ref: "Team" },
                player: String,
                assistPlayer: String,
                description: String,
            },
        ],
        notes: { type: String },
        screenshots: [{ type: String }],
        nextMatch: { type: Schema.Types.ObjectId, ref: "Match" },
        previousMatches: [{ type: Schema.Types.ObjectId, ref: "Match" }],
        bracketPosition: {
            x: { type: Number, default: 0 },
            y: { type: Number, default: 0 },
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
MatchSchema.index({ tournament: 1, round: 1 });
MatchSchema.index({ tournament: 1, group: 1 });
MatchSchema.index({ homeTeam: 1 });
MatchSchema.index({ awayTeam: 1 });
MatchSchema.index({ status: 1 });
MatchSchema.index({ scheduledAt: 1 });

const Match: Model<IMatch> =
    mongoose.models.Match || mongoose.model<IMatch>("Match", MatchSchema);

export default Match;
