import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMenuItem {
    _id?: string;
    label: string;
    href: string;
    icon?: string;
    order: number;
    isVisible: boolean;
    openInNewTab: boolean;
    children?: IMenuItem[];
}

export interface ISiteMenu extends Document {
    location: "navbar" | "footer" | "sidebar";
    items: IMenuItem[];
    updatedBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const MenuItemSchema = new Schema<IMenuItem>(
    {
        label: { type: String, required: true },
        href: { type: String, required: true },
        icon: { type: String, default: "" },
        order: { type: Number, default: 0 },
        isVisible: { type: Boolean, default: true },
        openInNewTab: { type: Boolean, default: false },
        children: [
            {
                label: { type: String, required: true },
                href: { type: String, required: true },
                icon: { type: String, default: "" },
                order: { type: Number, default: 0 },
                isVisible: { type: Boolean, default: true },
                openInNewTab: { type: Boolean, default: false },
            },
        ],
    },
    { _id: true }
);

const SiteMenuSchema = new Schema<ISiteMenu>(
    {
        location: {
            type: String,
            enum: ["navbar", "footer", "sidebar"],
            required: true,
            unique: true,
        },
        items: [MenuItemSchema],
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

const SiteMenu: Model<ISiteMenu> =
    mongoose.models.SiteMenu || mongoose.model<ISiteMenu>("SiteMenu", SiteMenuSchema);

export default SiteMenu;
