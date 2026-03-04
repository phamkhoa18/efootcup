import mongoose, { Document, Schema, Model } from "mongoose";

export interface IPaymentMethod {
    id: string;
    type: "bank_transfer" | "payos"; // bank_transfer = thủ công, payos = tự động
    mode: "auto" | "manual"; // auto = payOS, manual = chuyển khoản thủ công
    enabled: boolean;
    name: string;
    accountName: string;
    accountNumber: string;
    bankName?: string;
    bankBranch?: string;
    qrImage?: string;
    instructions?: string;
    icon?: string;
    // === PayOS Credentials (for auto mode) ===
    payosClientId?: string;
    payosApiKey?: string;
    payosChecksumKey?: string;
}

export interface IPaymentConfig extends Document {
    methods: IPaymentMethod[];
    // Global settings
    autoConfirm: boolean;
    paymentDeadlineHours: number;
    paymentNote: string;
    refundPolicy: string;
    // Callback URL config
    callbackBaseUrl: string; // Base URL for webhook callbacks
    // Timestamps
    updatedAt: Date;
    updatedBy: string;
}

const PaymentMethodSchema = new Schema({
    id: { type: String, required: true },
    type: {
        type: String,
        enum: ["bank_transfer", "payos"],
        required: true,
    },
    mode: { type: String, enum: ["auto", "manual"], default: "manual" },
    enabled: { type: Boolean, default: true },
    name: { type: String, required: true },
    accountName: { type: String, default: "" },
    accountNumber: { type: String, default: "" },
    bankName: { type: String, default: "" },
    bankBranch: { type: String, default: "" },
    qrImage: { type: String, default: "" },
    instructions: { type: String, default: "" },
    icon: { type: String, default: "" },
    // PayOS Credentials
    payosClientId: { type: String, default: "" },
    payosApiKey: { type: String, default: "" },
    payosChecksumKey: { type: String, default: "" },
});

const PaymentConfigSchema = new Schema(
    {
        methods: [PaymentMethodSchema],
        autoConfirm: { type: Boolean, default: false },
        paymentDeadlineHours: { type: Number, default: 24 },
        paymentNote: { type: String, default: "" },
        refundPolicy: { type: String, default: "" },
        callbackBaseUrl: { type: String, default: "" },
        updatedBy: { type: String, default: "" },
    },
    { timestamps: true }
);

// Singleton pattern - chỉ có 1 document config
PaymentConfigSchema.statics.getSingleton = async function () {
    let config = await this.findOne();
    if (!config) {
        config = await this.create({
            methods: [],
            autoConfirm: false,
            paymentDeadlineHours: 24,
        });
    }
    return config;
};
// Force re-register model to pick up schema changes (important for dev hot-reload)
if (mongoose.models.PaymentConfig) {
    delete mongoose.models.PaymentConfig;
}

const PaymentConfig: Model<IPaymentConfig> =
    mongoose.model<IPaymentConfig>("PaymentConfig", PaymentConfigSchema);

export default PaymentConfig;
