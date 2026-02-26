import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITournament extends Document {
    _id: mongoose.Types.ObjectId;
    title: string;
    slug: string;
    description: string;
    rules: string;
    banner?: string;
    thumbnail?: string;
    createdBy: mongoose.Types.ObjectId;
    status: "draft" | "registration" | "ongoing" | "completed" | "cancelled";
    format: "single_elimination" | "double_elimination" | "round_robin" | "swiss" | "group_stage";
    gameVersion: string;
    platform: "pc" | "ps4" | "ps5" | "xbox" | "mobile" | "cross_platform";
    maxTeams: number;
    minTeams: number;
    currentTeams: number;
    teamSize: number;
    prize: {
        total: string;
        first: string;
        second: string;
        third: string;
        description?: string;
    };
    schedule: {
        registrationStart?: Date;
        registrationEnd?: Date;
        tournamentStart?: Date;
        tournamentEnd?: Date;
    };
    settings: {
        matchDuration: number;
        extraTime: boolean;
        penalties: boolean;
        legsPerRound: number;
        homeAwayRule: boolean;
        awayGoalRule: boolean;
        seedingEnabled: boolean;
        autoAdvance: boolean;
    };
    // Format-specific scoring/ranking configuration
    scoring: {
        pointsPerWin: number;
        pointsPerDraw: number;
        pointsPerLoss: number;
        // Tiebreaker priority (lower = higher priority)
        tiebreakers: string[]; // e.g. ['points', 'goalDifference', 'goalsFor', 'headToHead']
        // Group stage specific
        teamsPerGroup?: number;
        advancePerGroup?: number;
        // Swiss specific
        numberOfRounds?: number;
        // Double elimination
        resetFinal?: boolean; // Grand final reset if loser bracket winner wins first match
    };
    contact: {
        phone?: string;
        email?: string;
        facebook?: string;
        discord?: string;
        zalo?: string;
    };
    location?: string;
    isOnline: boolean;
    entryFee: number;
    currency: string;
    tags: string[];
    views: number;
    likes: number;
    isPublic: boolean;
    isFeatured: boolean;
    groups?: {
        name: string;
        teams: mongoose.Types.ObjectId[];
    }[];
    brackets?: {
        round: number;
        matches: mongoose.Types.ObjectId[];
    }[];
    createdAt: Date;
    updatedAt: Date;
}

// Scoring defaults per format
export const SCORING_DEFAULTS: Record<string, Partial<ITournament["scoring"]>> = {
    single_elimination: {
        pointsPerWin: 0,
        pointsPerDraw: 0,
        pointsPerLoss: 0,
        tiebreakers: [],
    },
    double_elimination: {
        pointsPerWin: 0,
        pointsPerDraw: 0,
        pointsPerLoss: 0,
        tiebreakers: [],
        resetFinal: true,
    },
    round_robin: {
        pointsPerWin: 3,
        pointsPerDraw: 1,
        pointsPerLoss: 0,
        tiebreakers: ["points", "goalDifference", "goalsFor", "headToHead"],
    },
    group_stage: {
        pointsPerWin: 3,
        pointsPerDraw: 1,
        pointsPerLoss: 0,
        tiebreakers: ["points", "goalDifference", "goalsFor", "headToHead"],
        teamsPerGroup: 4,
        advancePerGroup: 2,
    },
    swiss: {
        pointsPerWin: 3,
        pointsPerDraw: 1,
        pointsPerLoss: 0,
        tiebreakers: ["points", "buchholz", "goalDifference", "goalsFor"],
        numberOfRounds: 0, // auto-calculated from team count
    },
};

const TournamentSchema = new Schema<ITournament>(
    {
        title: {
            type: String,
            required: [true, "Vui lòng nhập tên giải đấu"],
            trim: true,
            maxlength: [200, "Tên giải đấu không được quá 200 ký tự"],
        },
        slug: {
            type: String,
            unique: true,
            lowercase: true,
        },
        description: {
            type: String,
            default: "",
            maxlength: [5000, "Mô tả không được quá 5000 ký tự"],
        },
        rules: {
            type: String,
            default: "",
            maxlength: [10000, "Nội quy không được quá 10000 ký tự"],
        },
        banner: { type: String, default: "" },
        thumbnail: { type: String, default: "" },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        status: {
            type: String,
            enum: ["draft", "registration", "ongoing", "completed", "cancelled"],
            default: "draft",
        },
        format: {
            type: String,
            enum: ["single_elimination", "double_elimination", "round_robin", "swiss", "group_stage"],
            default: "single_elimination",
        },
        gameVersion: {
            type: String,
            default: "eFootball 2025",
        },
        platform: {
            type: String,
            enum: ["pc", "ps4", "ps5", "xbox", "mobile", "cross_platform"],
            default: "cross_platform",
        },
        maxTeams: {
            type: Number,
            required: [true, "Vui lòng nhập số đội tối đa"],
            min: [2, "Phải có ít nhất 2 đội"],
            max: [256, "Tối đa 256 đội"],
        },
        minTeams: {
            type: Number,
            default: 2,
            min: 2,
        },
        currentTeams: {
            type: Number,
            default: 0,
        },
        teamSize: {
            type: Number,
            default: 1,
            min: 1,
            max: 11,
        },
        prize: {
            total: { type: String, default: "0 VNĐ" },
            first: { type: String, default: "" },
            second: { type: String, default: "" },
            third: { type: String, default: "" },
            description: { type: String, default: "" },
        },
        schedule: {
            registrationStart: { type: Date },
            registrationEnd: { type: Date },
            tournamentStart: { type: Date },
            tournamentEnd: { type: Date },
        },
        settings: {
            matchDuration: { type: Number, default: 10 },
            extraTime: { type: Boolean, default: true },
            penalties: { type: Boolean, default: true },
            legsPerRound: { type: Number, default: 1 },
            homeAwayRule: { type: Boolean, default: false },
            awayGoalRule: { type: Boolean, default: false },
            seedingEnabled: { type: Boolean, default: false },
            autoAdvance: { type: Boolean, default: false },
        },
        scoring: {
            pointsPerWin: { type: Number, default: 3 },
            pointsPerDraw: { type: Number, default: 1 },
            pointsPerLoss: { type: Number, default: 0 },
            tiebreakers: [{ type: String }],
            teamsPerGroup: { type: Number },
            advancePerGroup: { type: Number },
            numberOfRounds: { type: Number },
            resetFinal: { type: Boolean },
        },
        contact: {
            phone: { type: String, default: "" },
            email: { type: String, default: "" },
            facebook: { type: String, default: "" },
            discord: { type: String, default: "" },
            zalo: { type: String, default: "" },
        },
        location: { type: String, default: "" },
        isOnline: { type: Boolean, default: true },
        entryFee: { type: Number, default: 0 },
        currency: { type: String, default: "VNĐ" },
        tags: [{ type: String }],
        views: { type: Number, default: 0 },
        likes: { type: Number, default: 0 },
        isPublic: { type: Boolean, default: true },
        isFeatured: { type: Boolean, default: false },
        groups: [
            {
                name: String,
                teams: [{ type: Schema.Types.ObjectId, ref: "Team" }],
            },
        ],
        brackets: [
            {
                round: Number,
                matches: [{ type: Schema.Types.ObjectId, ref: "Match" }],
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Auto-generate slug from title
TournamentSchema.pre("save", async function (this: ITournament) {
    if (this.isModified("title") || !this.slug) {
        this.slug =
            this.title
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/đ/g, "d")
                .replace(/Đ/g, "D")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "") +
            "-" +
            Date.now().toString(36);
    }

    // Auto-set scoring defaults based on format if not explicitly set
    if (this.isModified("format") && (!this.scoring || !this.scoring.tiebreakers || this.scoring.tiebreakers.length === 0)) {
        const defaults = SCORING_DEFAULTS[this.format];
        if (defaults) {
            this.scoring = {
                pointsPerWin: defaults.pointsPerWin ?? 3,
                pointsPerDraw: defaults.pointsPerDraw ?? 1,
                pointsPerLoss: defaults.pointsPerLoss ?? 0,
                tiebreakers: defaults.tiebreakers || [],
                teamsPerGroup: defaults.teamsPerGroup,
                advancePerGroup: defaults.advancePerGroup,
                numberOfRounds: defaults.numberOfRounds,
                resetFinal: defaults.resetFinal,
            };
        }
    }

    // Auto-calculate Swiss rounds: ceil(log2(maxTeams))
    if (this.format === "swiss" && this.scoring && (!this.scoring.numberOfRounds || this.scoring.numberOfRounds === 0)) {
        this.scoring.numberOfRounds = Math.ceil(Math.log2(this.maxTeams || 8));
    }
});

// Indexes
TournamentSchema.index({ createdBy: 1 });
TournamentSchema.index({ status: 1 });
TournamentSchema.index({ "schedule.tournamentStart": 1 });
TournamentSchema.index({ isFeatured: 1 });
TournamentSchema.index({ tags: 1 });

const Tournament: Model<ITournament> =
    mongoose.models.Tournament ||
    mongoose.model<ITournament>("Tournament", TournamentSchema);

export default Tournament;
