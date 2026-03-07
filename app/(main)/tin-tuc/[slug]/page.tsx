"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    ArrowLeft, Clock, Eye, Calendar, Tag, Share2,
    Newspaper, Pin, Star, ChevronRight, Loader2, Copy, Check, Trophy,
    TrendingUp, Flame, ArrowUp, BookmarkPlus, ArrowRight
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { CategoryIcon } from "@/lib/category-icons";

const fallbackCatInfo: Record<string, { label: string; color: string; bg: string; gradient: string }> = {
    news: { label: "Tin tức", color: "text-blue-600", bg: "bg-blue-50", gradient: "from-blue-500 to-blue-600" },
    announcement: { label: "Thông báo", color: "text-amber-600", bg: "bg-amber-50", gradient: "from-amber-500 to-orange-500" },
    guide: { label: "Hướng dẫn", color: "text-emerald-600", bg: "bg-emerald-50", gradient: "from-emerald-500 to-teal-500" },
    update: { label: "Cập nhật", color: "text-purple-600", bg: "bg-purple-50", gradient: "from-purple-500 to-violet-500" },
};

export default function PostDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const router = useRouter();
    const [post, setPost] = useState<any>(null);
    const [related, setRelated] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [dbCategories, setDbCategories] = useState<any[]>([]);
    const [readProgress, setReadProgress] = useState(0);

    // Load categories
    useEffect(() => {
        fetch("/api/categories")
            .then(r => r.json())
            .then(data => { if (data.success) setDbCategories(data.data.categories || []); })
            .catch(console.error);
    }, []);

    // Helper: get category display info
    const getCatInfo = (item: any) => {
        const catSlug = item.category;
        const refId = item.categoryRef?._id || item.categoryRef;
        const found = dbCategories.find(c => c.slug === catSlug || c._id === refId);
        if (found) {
            return {
                label: found.name,
                gradient: found.gradient || "from-blue-500 to-blue-600",
                hexColor: found.color,
                color: `text-[${found.color}]`,
                iconName: found.icon || "Newspaper",
                slug: found.slug,
            };
        }
        const fb = fallbackCatInfo[catSlug] || fallbackCatInfo.news;
        return { ...fb, hexColor: "", iconName: "Newspaper", slug: catSlug };
    };

    useEffect(() => { loadPost(); }, [slug]);
    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 600);
            // Reading progress
            const winH = window.innerHeight;
            const docH = document.documentElement.scrollHeight - winH;
            setReadProgress(docH > 0 ? Math.min(100, (window.scrollY / docH) * 100) : 0);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const loadPost = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/posts/${slug}`);
            const data = await res.json();
            if (data.success) {
                setPost(data.data.post);
                setRelated(data.data.related || []);
            } else { router.push("/tin-tuc"); }
        } catch (e) { router.push("/tin-tuc"); }
        finally { setIsLoading(false); }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const timeAgo = (date: string) => {
        try { return formatDistanceToNow(new Date(date), { addSuffix: true, locale: vi }); } catch { return ""; }
    };
    const formatDate = (date: string) => {
        try { return format(new Date(date), "dd MMMM, yyyy", { locale: vi }); } catch { return ""; }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
                <div className="text-center">
                    <Loader2 className="w-7 h-7 animate-spin text-[#1b64f2] mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Đang tải bài viết...</p>
                </div>
            </div>
        );
    }

    if (!post) return null;

    const cat = getCatInfo(post);

    return (
        <div className="min-h-screen bg-[#f8f9fa] pt-16">
            {/* Reading Progress Bar */}
            <div className="fixed top-0 left-0 right-0 h-0.5 bg-gray-100 z-50">
                <div
                    className="h-full bg-gradient-to-r from-[#1b64f2] to-[#3b82f6] transition-all duration-150 ease-out"
                    style={{ width: `${readProgress}%` }}
                />
            </div>

            {/* Breadcrumb Bar */}
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-[1200px] mx-auto px-4 lg:px-6">
                    <div className="flex items-center gap-2 h-10 text-[11px]">
                        <Link href="/" className="text-gray-400 hover:text-[#1b64f2] transition-colors flex-shrink-0">Trang chủ</Link>
                        <ChevronRight className="w-2.5 h-2.5 text-gray-300 flex-shrink-0" />
                        <Link href="/tin-tuc" className="text-gray-400 hover:text-[#1b64f2] transition-colors flex-shrink-0">Tin tức</Link>
                        {cat.label && (
                            <>
                                <ChevronRight className="w-2.5 h-2.5 text-gray-300 flex-shrink-0" />
                                <Link
                                    href={`/tin-tuc?category=${cat.slug || ''}`}
                                    className="font-medium flex-shrink-0 hover:underline"
                                    style={cat.hexColor ? { color: cat.hexColor } : undefined}
                                >
                                    {cat.label}
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-[1200px] mx-auto px-4 lg:px-6 py-6">
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Main Article */}
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2">
                        <article className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                            {/* Cover Image */}
                            {post.coverImage && (
                                <div className="relative aspect-[16/8] overflow-hidden">
                                    <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                                </div>
                            )}

                            {/* Article Header */}
                            <div className="p-5 lg:p-7 pb-0">
                                {/* Category & meta strip */}
                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r ${cat.gradient} text-white text-[10px] font-medium rounded uppercase tracking-wider`}>
                                        <CategoryIcon name={cat.iconName} className="w-3 h-3" /> {cat.label}
                                    </span>
                                    {post.isPinned && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-[10px] font-medium rounded uppercase tracking-wider">
                                            <Flame className="w-2.5 h-2.5" /> NÓNG
                                        </span>
                                    )}
                                    {post.isFeatured && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-400 text-gray-900 text-[10px] font-medium rounded uppercase tracking-wider">
                                            <Star className="w-2.5 h-2.5 fill-current" /> NỔI BẬT
                                        </span>
                                    )}
                                </div>

                                {/* Title */}
                                <h1 className="text-2xl lg:text-[28px] font-semibold text-gray-900 leading-tight mb-3">{post.title}</h1>

                                {/* Excerpt */}
                                {post.excerpt && (
                                    <p className="text-[15px] text-gray-500 leading-relaxed mb-4 border-l-2 border-[#1b64f2]/30 pl-4 italic">{post.excerpt}</p>
                                )}

                                {/* Author & Date Row */}
                                <div className="flex items-center justify-between pb-5 border-b border-gray-100 flex-wrap gap-3">
                                    <div className="flex items-center gap-3">
                                        {post.author?.avatar ? (
                                            <img src={post.author.avatar} alt={post.author.name} className="w-9 h-9 rounded-full border-2 border-gray-100 object-cover" />
                                        ) : (
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1b64f2] to-[#0d3b8f] flex items-center justify-center text-white font-medium text-sm">
                                                {(post.author?.name || "A").charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{post.author?.name || "Admin"}</p>
                                            <p className="text-[11px] text-gray-400 flex items-center gap-2">
                                                <span className="flex items-center gap-1"><Calendar className="w-2.5 h-2.5" /> {formatDate(post.publishedAt || post.createdAt)}</span>
                                                <span>·</span>
                                                <span>{timeAgo(post.publishedAt || post.createdAt)}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-[11px] text-gray-400">
                                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {post.views || 0}</span>
                                        {post.readingTime > 0 && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {post.readingTime} phút</span>}
                                        <button onClick={copyLink}
                                            className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all" title="Copy link">
                                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Article Content */}
                            <div className="px-5 lg:px-7 py-6">
                                <div
                                    className="prose prose-sm lg:prose-base max-w-none
                                        prose-headings:text-gray-900 prose-headings:font-semibold prose-headings:tracking-tight
                                        prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:border-l-2 prose-h2:border-[#1b64f2]/40 prose-h2:pl-3
                                        prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
                                        prose-p:text-gray-600 prose-p:leading-[1.8] prose-p:text-[15px]
                                        prose-a:text-[#1b64f2] prose-a:font-medium prose-a:no-underline hover:prose-a:underline
                                        prose-img:rounded-xl prose-img:mx-auto prose-img:shadow-sm
                                        prose-blockquote:border-l-[#1b64f2] prose-blockquote:bg-blue-50/30 prose-blockquote:rounded-r-lg prose-blockquote:py-2 prose-blockquote:text-gray-500 prose-blockquote:not-italic
                                        prose-strong:text-gray-800 prose-strong:font-semibold
                                        prose-li:text-gray-600
                                        prose-code:bg-gray-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:text-pink-600"
                                    dangerouslySetInnerHTML={{ __html: post.content }}
                                />
                            </div>

                            {/* Tags */}
                            {post.tags && post.tags.length > 0 && (
                                <div className="px-5 lg:px-7 pb-5">
                                    <div className="flex items-center gap-2 flex-wrap pt-4 border-t border-gray-100">
                                        <Tag className="w-3.5 h-3.5 text-gray-400" />
                                        {post.tags.map((tag: string, i: number) => (
                                            <span key={i} className="text-[11px] font-medium text-gray-500 bg-gray-50 px-2.5 py-1 rounded-md hover:bg-[#1b64f2]/5 hover:text-[#1b64f2] transition-colors cursor-default">#{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Gallery */}
                            {post.gallery && post.gallery.length > 0 && (
                                <div className="px-5 lg:px-7 pb-6">
                                    <div className="pt-4 border-t border-gray-100">
                                        <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Thư viện ảnh</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                            {post.gallery.map((url: string, i: number) => (
                                                <div key={i} className="rounded-lg overflow-hidden aspect-video">
                                                    <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Share Bar */}
                            <div className="px-5 lg:px-7 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Share2 className="w-3.5 h-3.5 text-gray-400" />
                                    <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Chia sẻ:</span>
                                    <button onClick={copyLink} className="px-3 py-1.5 bg-white border border-gray-200 rounded-md text-[10px] font-medium text-gray-500 hover:text-[#1b64f2] hover:border-[#1b64f2]/30 transition-all flex items-center gap-1">
                                        {copied ? <><Check className="w-3 h-3 text-emerald-500" /> Đã copy</> : <><Copy className="w-3 h-3" /> Copy link</>}
                                    </button>
                                </div>
                                <div className="flex items-center gap-3 text-[11px] text-gray-400">
                                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {post.views || 0} lượt xem</span>
                                </div>
                            </div>
                        </article>

                        {/* Related Articles */}
                        {related.length > 0 && (
                            <div className="mt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-1 h-5 rounded-full bg-[#1b64f2]" />
                                        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Bài viết liên quan</h2>
                                    </div>
                                    <Link href="/tin-tuc" className="text-[11px] text-[#1b64f2] font-medium flex items-center gap-1 hover:underline">
                                        Xem tất cả <ArrowRight className="w-3 h-3" />
                                    </Link>
                                </div>
                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {related.slice(0, 6).map((rp) => {
                                        const rCat = getCatInfo(rp);
                                        return (
                                            <Link key={rp._id} href={`/tin-tuc/${rp.slug}`} className="group block bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-transparent transition-all duration-300">
                                                <div className="relative aspect-[16/10] overflow-hidden">
                                                    {rp.coverImage ? (
                                                        <img src={rp.coverImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                                            <Newspaper className="w-8 h-8 text-gray-250" />
                                                        </div>
                                                    )}
                                                    <div className="absolute top-2.5 left-2.5">
                                                        <span
                                                            className="text-[9px] font-medium uppercase tracking-wider px-2 py-0.5 rounded text-white inline-flex items-center gap-0.5"
                                                            style={rCat.hexColor ? { backgroundColor: rCat.hexColor } : { backgroundColor: '#1b64f2' }}
                                                        >
                                                            <CategoryIcon name={rCat.iconName} className="w-2.5 h-2.5" />
                                                            {rCat.label}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="p-3.5">
                                                    <h4 className="text-[13px] font-medium text-gray-900 line-clamp-2 leading-snug group-hover:text-[#1b64f2] transition-colors mb-2">
                                                        {rp.title}
                                                    </h4>
                                                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                                        <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {timeAgo(rp.publishedAt || rp.createdAt)}</span>
                                                        <span>·</span>
                                                        <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" /> {rp.views || 0}</span>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* Sidebar */}
                    <div className="space-y-5">
                        {/* Article Info Card */}
                        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden sticky top-20">
                            <div className="p-4 border-b border-gray-50">
                                <div className="flex items-center gap-2.5 mb-3">
                                    {post.author?.avatar ? (
                                        <img src={post.author.avatar} alt="" className="w-10 h-10 rounded-full border-2 border-gray-100 object-cover" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1b64f2] to-[#0d3b8f] flex items-center justify-center text-white font-medium text-sm">
                                            {(post.author?.name || "A").charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{post.author?.name || "Admin"}</p>
                                        <p className="text-[10px] text-gray-400">Tác giả</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="bg-gray-50 rounded-lg py-2">
                                        <p className="text-sm font-semibold text-gray-900">{post.views || 0}</p>
                                        <p className="text-[9px] text-gray-400 uppercase font-medium">Lượt xem</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg py-2">
                                        <p className="text-sm font-semibold text-gray-900">{post.readingTime || 1}</p>
                                        <p className="text-[9px] text-gray-400 uppercase font-medium">Phút đọc</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg py-2">
                                        <p className="text-sm font-semibold text-gray-900">{post.likes || 0}</p>
                                        <p className="text-[9px] text-gray-400 uppercase font-medium">Thích</p>
                                    </div>
                                </div>
                            </div>

                            {/* Share */}
                            <div className="p-3">
                                <button onClick={copyLink} className="w-full py-2.5 bg-[#1b64f2]/5 text-[#1b64f2] text-xs font-medium rounded-lg hover:bg-[#1b64f2]/10 transition-colors flex items-center justify-center gap-1.5">
                                    {copied ? <><Check className="w-3.5 h-3.5" /> Đã copy link!</> : <><Share2 className="w-3.5 h-3.5" /> Chia sẻ bài viết</>}
                                </button>
                            </div>

                            {/* Related in Sidebar */}
                            {related.length > 0 && (
                                <div className="border-t border-gray-50">
                                    <div className="px-4 py-2.5 flex items-center gap-1.5">
                                        <TrendingUp className="w-3.5 h-3.5 text-red-500" />
                                        <span className="text-[10px] font-semibold text-gray-900 uppercase tracking-wider">Tin liên quan</span>
                                    </div>
                                    <div className="divide-y divide-gray-50">
                                        {related.slice(0, 5).map((rp) => {
                                            const rpCat = getCatInfo(rp);
                                            return (
                                                <Link key={rp._id} href={`/tin-tuc/${rp.slug}`} className="group flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50/50 transition-colors">
                                                    {rp.coverImage ? (
                                                        <img src={rp.coverImage} alt="" className="w-14 h-10 rounded object-cover flex-shrink-0" />
                                                    ) : (
                                                        <div className="w-14 h-10 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                            <Newspaper className="w-3.5 h-3.5 text-gray-300" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-[11px] font-medium text-gray-700 line-clamp-2 leading-snug group-hover:text-[#1b64f2] transition-colors">{rp.title}</h4>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span
                                                                className="text-[8px] font-medium uppercase"
                                                                style={rpCat.hexColor ? { color: rpCat.hexColor } : undefined}
                                                            >
                                                                {rpCat.label}
                                                            </span>
                                                            <span className="text-[9px] text-gray-300">·</span>
                                                            <span className="text-[9px] text-gray-400">{timeAgo(rp.publishedAt || rp.createdAt)}</span>
                                                        </div>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Categories */}
                        {dbCategories.length > 0 && (
                            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                                <div className="px-4 py-3 border-b border-gray-50">
                                    <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Danh mục</h3>
                                </div>
                                <div className="p-3 space-y-1">
                                    {dbCategories.map((c: any) => (
                                        <Link key={c._id} href={`/tin-tuc?category=${c.slug}`}
                                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-gray-50 transition-all"
                                        >
                                            <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${c.gradient || "from-blue-500 to-blue-600"} flex items-center justify-center flex-shrink-0`}>
                                                <CategoryIcon name={c.icon} className="w-3 h-3 text-white" />
                                            </div>
                                            <span className="text-xs font-medium flex-1">{c.name}</span>
                                            {c.postCount > 0 && (
                                                <span className="text-[10px] text-gray-400">{c.postCount}</span>
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Back to news */}
                        <Link href="/tin-tuc" className="flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-100 text-xs font-medium text-gray-500 hover:text-[#1b64f2] hover:border-[#1b64f2]/20 transition-all">
                            <ArrowLeft className="w-3.5 h-3.5" /> Quay lại trang Tin tức
                        </Link>
                    </div>
                </div>
            </div>

            {/* Scroll to top */}
            {showScrollTop && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    className="fixed bottom-6 right-6 w-10 h-10 bg-[#1b64f2] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#1554d0] transition-colors z-40"
                >
                    <ArrowUp className="w-4 h-4" />
                </motion.button>
            )}
        </div>
    );
}
