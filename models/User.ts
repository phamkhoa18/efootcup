import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    email: string;
    password: string;
    role: "manager" | "user";
    avatar?: string;
    phone?: string;
    bio?: string;
    gamerId?: string; // eFootball ID
    stats: {
        tournamentsCreated: number;
        tournamentsJoined: number;
        wins: number;
        losses: number;
        draws: number;
        goalsScored: number;
        goalsConceded: number;
    };
    isActive: boolean;
    isVerified: boolean;
    verificationCode?: string;
    verificationCodeExpires?: Date;
    lastLogin?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        name: {
            type: String,
            required: [true, "Vui lòng nhập họ và tên"],
            trim: true,
            maxlength: [100, "Tên không được quá 100 ký tự"],
        },
        email: {
            type: String,
            required: [true, "Vui lòng nhập email"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, "Email không hợp lệ"],
        },
        password: {
            type: String,
            required: [true, "Vui lòng nhập mật khẩu"],
            minlength: [8, "Mật khẩu phải có ít nhất 8 ký tự"],
            select: false, // Don't return password by default
        },
        role: {
            type: String,
            enum: ["manager", "user"],
            default: "user",
        },
        avatar: {
            type: String,
            default: "",
        },
        phone: {
            type: String,
            default: "",
        },
        bio: {
            type: String,
            default: "",
            maxlength: [500, "Bio không được quá 500 ký tự"],
        },
        gamerId: {
            type: String,
            default: "",
        },
        stats: {
            tournamentsCreated: { type: Number, default: 0 },
            tournamentsJoined: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            goalsScored: { type: Number, default: 0 },
            goalsConceded: { type: Number, default: 0 },
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        verificationCode: {
            type: String,
            select: false,
        },
        verificationCodeExpires: {
            type: Date,
            select: false,
        },
        lastLogin: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
UserSchema.index({ role: 1 });
UserSchema.index({ gamerId: 1 });

const User: Model<IUser> =
    mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
