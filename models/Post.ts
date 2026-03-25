import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPost extends Document {
    _id: mongoose.Types.ObjectId;
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    category: string; // legacy string field
    categoryRef?: mongoose.Types.ObjectId; // new: reference to Category model
    status: "draft" | "published" | "scheduled";
    coverImage: string;
    gallery: string[];
    author: mongoose.Types.ObjectId;
    tags: string[];
    views: number;
    isPinned: boolean;
    isFeatured: boolean;
    publishedAt?: Date;
    scheduledAt?: Date;
    // SEO Fields
    seo: {
        metaTitle: string;
        metaDescription: string;
        metaKeywords: string[];
        ogImage: string;
        ogTitle: string;
        ogDescription: string;
        canonicalUrl: string;
        noIndex: boolean;
        structuredData: string;
    };
    // Reading info
    readingTime: number;
    wordCount: number;
    // Engagement
    likes: number;
    // Version history
    lastEditedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const PostSchema = new Schema<IPost>(
    {
        title: {
            type: String,
            required: [true, "Vui lòng nhập tiêu đề"],
            trim: true,
            maxlength: [200, "Tiêu đề không được quá 200 ký tự"],
        },
        slug: {
            type: String,
            unique: true,
            trim: true,
        },
        content: {
            type: String,
            required: [true, "Vui lòng nhập nội dung"],
        },
        excerpt: {
            type: String,
            default: "",
            maxlength: [500, "Tóm tắt không được quá 500 ký tự"],
        },
        category: {
            type: String,
            default: "news",
        },
        categoryRef: {
            type: Schema.Types.ObjectId,
            ref: "Category",
            default: null,
        },
        status: {
            type: String,
            enum: ["draft", "published", "scheduled"],
            default: "draft",
        },
        coverImage: {
            type: String,
            default: "",
        },
        gallery: {
            type: [String],
            default: [],
        },
        author: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        tags: [{ type: String }],
        views: {
            type: Number,
            default: 0,
        },
        isPinned: {
            type: Boolean,
            default: false,
        },
        isFeatured: {
            type: Boolean,
            default: false,
        },
        publishedAt: {
            type: Date,
        },
        scheduledAt: {
            type: Date,
        },
        // SEO
        seo: {
            metaTitle: { type: String, default: "" },
            metaDescription: { type: String, default: "" },
            metaKeywords: [{ type: String }],
            ogImage: { type: String, default: "" },
            ogTitle: { type: String, default: "" },
            ogDescription: { type: String, default: "" },
            canonicalUrl: { type: String, default: "" },
            noIndex: { type: Boolean, default: false },
            structuredData: { type: String, default: "" },
        },
        readingTime: {
            type: Number,
            default: 0,
        },
        wordCount: {
            type: Number,
            default: 0,
        },
        likes: {
            type: Number,
            default: 0,
        },
        lastEditedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
    }
);

// Auto-generate slug from title
PostSchema.pre("save", function () {
    if (this.isModified("title") || !this.slug) {
        this.slug = this.title
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/Đ/g, "D")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            + "-" + Date.now();
    }

    // Auto-calculate word count & reading time
    if (this.isModified("content")) {
        const plainText = this.content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
        this.wordCount = plainText.split(" ").filter(Boolean).length;
        this.readingTime = Math.max(1, Math.ceil(this.wordCount / 200));
    }

    // Auto-fill SEO defaults from main content
    if (this.isModified("title") && !this.seo?.metaTitle) {
        if (!this.seo) this.seo = {} as any;
        this.seo.metaTitle = this.title;
    }
    if (this.isModified("excerpt") && !this.seo?.metaDescription) {
        if (!this.seo) this.seo = {} as any;
        this.seo.metaDescription = this.excerpt;
    }
});

PostSchema.index({ status: 1, publishedAt: -1 });
PostSchema.index({ category: 1 });
PostSchema.index({ tags: 1 });
PostSchema.index({ isFeatured: 1 });

const Post: Model<IPost> =
    mongoose.models.Post || mongoose.model<IPost>("Post", PostSchema);

export default Post;
