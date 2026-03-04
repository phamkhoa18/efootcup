import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICategory extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    slug: string;
    description: string;
    icon: string; // lucide icon name
    color: string; // hex color for badge/accent
    gradient: string; // tailwind gradient classes
    order: number; // sort order
    isActive: boolean;
    postCount: number; // virtual or cached count
    parent?: mongoose.Types.ObjectId; // for sub-categories
    createdAt: Date;
    updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
    {
        name: {
            type: String,
            required: [true, "Vui lòng nhập tên danh mục"],
            trim: true,
            maxlength: [100, "Tên danh mục không được quá 100 ký tự"],
        },
        slug: {
            type: String,
            unique: true,
            trim: true,
        },
        description: {
            type: String,
            default: "",
            maxlength: [500, "Mô tả không được quá 500 ký tự"],
        },
        icon: {
            type: String,
            default: "Newspaper",
        },
        color: {
            type: String,
            default: "#1b64f2",
        },
        gradient: {
            type: String,
            default: "from-blue-500 to-blue-600",
        },
        order: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        postCount: {
            type: Number,
            default: 0,
        },
        parent: {
            type: Schema.Types.ObjectId,
            ref: "Category",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Auto-generate slug from name
CategorySchema.pre("save", function () {
    if (this.isModified("name") || !this.slug) {
        this.slug = this.name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/Đ/g, "D")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }
});

CategorySchema.index({ slug: 1 });
CategorySchema.index({ order: 1 });
CategorySchema.index({ isActive: 1 });
CategorySchema.index({ parent: 1 });

const Category: Model<ICategory> =
    mongoose.models.Category || mongoose.model<ICategory>("Category", CategorySchema);

export default Category;
