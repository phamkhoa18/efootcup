"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    Newspaper, Search, Clock, Eye, ChevronRight, ChevronLeft,
    Megaphone, BookOpen, RefreshCw, Pin, Star, Loader2,
    Calendar, ArrowRight, TrendingUp, Flame, Zap, Trophy,
    Filter, X, FolderTree
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { CategoryIcon } from "@/lib/category-icons";

// Fallback for when no categories exist in DB
const fallbackCategories: Record<string, { label: string; color: string; bg: string; gradient: string }> = {
    news: { label: "Tin tức", color: "text-blue-600", bg: "bg-blue-500", gradient: "from-blue-500 to-blue-600" },
    announcement: { label: "Thông báo", color: "text-amber-600", bg: "bg-amber-500", gradient: "from-amber-500 to-orange-500" },
    guide: { label: "Hướng dẫn", color: "text-emerald-600", bg: "bg-emerald-500", gradient: "from-emerald-500 to-teal-500" },
    update: { label: "Cập nhật", color: "text-purple-600", bg: "bg-purple-500", gradient: "from-purple-500 to-violet-500" },
};

export default function NewsPage() {
    const [posts, setPosts] = useState<any[]>([]);
    const [featured, setFeatured] = useState<any[]>([]);
    const [latest, setLatest] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const [category, setCategory] = useState("");
    const [dbCategories, setDbCategories] = useState<any[]>([]);

    // Load categories from API
    useEffect(() => {
        fetch("/api/categories")
            .then(r => r.json())
            .then(data => { if (data.success) setDbCategories(data.data.categories || []); })
            .catch(console.error);
    }, []);

    // Helper: get category display info from slug or ref
    const getCategoryInfo = (post: any) => {
        // First try to find in dynamic categories
        const slug = post.category;
        const refId = post.categoryRef?._id || post.categoryRef;
        const found = dbCategories.find(c => c.slug === slug || c._id === refId);
        if (found) {
            return {
                label: found.name,
                color: `text-[${found.color}]`,
                bg: `bg-[${found.color}]`,
                gradient: found.gradient || "from-blue-500 to-blue-600",
                hexColor: found.color,
                iconName: found.icon || "Newspaper",
            };
        }
        // Fallback to hardcoded
        const fb = fallbackCategories[slug] || fallbackCategories.news;
        return { ...fb, hexColor: "", iconName: "Newspaper" };
    };

    useEffect(() => { loadPosts(); }, [page, category]);
    useEffect(() => {
        // Load featured
        fetch("/api/posts?featured=true&limit=5")
            .then(r => r.json())
            .then(data => { if (data.success) setFeatured(data.data.posts); });
        // Load latest sidebar
        fetch("/api/posts?limit=6")
            .then(r => r.json())
            .then(data => { if (data.success) setLatest(data.data.posts); });
    }, []);

    const loadPosts = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            params.set("page", page.toString());
            params.set("limit", "9");
            if (category) params.set("category", category);
            if (search) params.set("search", search);
            const res = await fetch(`/api/posts?${params}`);
            const data = await res.json();
            if (data.success) {
                setPosts(data.data.posts);
                setTotalPages(data.data.pagination.totalPages);
            }
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        loadPosts();
    };

    const timeAgo = (date: string) => {
        try { return formatDistanceToNow(new Date(date), { addSuffix: true, locale: vi }); } catch { return ""; }
    };
    const formatDate = (date: string) => {
        try { return format(new Date(date), "dd/MM/yyyy", { locale: vi }); } catch { return ""; }
    };

    const heroPost = featured[0];
    const sideFeatured = featured.slice(1, 4);

    return (
        <div className="min-h-screen bg-[#f5f5f5] pt-16">
            {/* ===== Top Bar ===== */}
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-[1200px] mx-auto px-4 lg:px-6">
                    <div className="flex items-center justify-between h-10">
                        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                            <Flame className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                            <span className="text-[11px] font-bold text-red-500 uppercase tracking-wider flex-shrink-0">HOT</span>
                            <div className="h-3 w-px bg-gray-200 mx-1.5 flex-shrink-0" />
                            {latest.slice(0, 3).map((p, i) => (
                                <Link key={p._id} href={`/tin-tuc/${p.slug}`} className="text-[11px] text-gray-500 hover:text-gray-900 transition-colors whitespace-nowrap flex-shrink-0">
                                    {p.title.length > 45 ? p.title.substring(0, 45) + "..." : p.title}
                                    {i < 2 && <span className="mx-2 text-gray-200">|</span>}
                                </Link>
                            ))}
                        </div>
                        <button onClick={() => setSearchOpen(!searchOpen)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors flex-shrink-0">
                            <Search className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Search Overlay */}
            <AnimatePresence>
                {searchOpen && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="bg-white border-b border-gray-200 shadow-sm">
                        <div className="max-w-[1200px] mx-auto px-4 lg:px-6 py-3">
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm bài viết..."
                                        className="w-full h-10 pl-10 pr-4 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                                        autoFocus />
                                </div>
                                <button type="submit" className="h-10 px-5 bg-[#1b64f2] text-white text-sm font-semibold rounded-lg hover:bg-[#1554d0] transition-colors">Tìm</button>
                                <button type="button" onClick={() => { setSearchOpen(false); setSearch(""); }} className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-gray-100">
                                    <X className="w-4 h-4 text-gray-400" />
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ===== Hero Section ===== */}
            {heroPost && (
                <section className="bg-white">
                    <div className="max-w-[1200px] mx-auto px-4 lg:px-6 py-5">
                        <div className="grid lg:grid-cols-5 gap-4">
                            {/* Main Hero */}
                            <div className="lg:col-span-3">
                                <Link href={`/tin-tuc/${heroPost.slug}`} className="group relative block rounded-xl overflow-hidden aspect-[16/9]">
                                    {heroPost.coverImage ? (
                                        <img src={heroPost.coverImage} alt={heroPost.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-[#1b64f2] to-[#0d3b8f] flex items-center justify-center">
                                            <Trophy className="w-16 h-16 text-white/20" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                                    <div className="absolute bottom-0 left-0 right-0 p-5 lg:p-6">
                                        {heroPost.isPinned && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded uppercase tracking-wider mb-2">
                                                <Zap className="w-2.5 h-2.5" /> NÓNG
                                            </span>
                                        )}
                                        {(() => {
                                            const hCat = getCategoryInfo(heroPost);
                                            return (
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r ${hCat.gradient} text-white text-[10px] font-bold rounded uppercase tracking-wider mb-2 ml-1`}
                                                >
                                                    <CategoryIcon name={hCat.iconName} className="w-2.5 h-2.5" />
                                                    {hCat.label}
                                                </span>
                                            );
                                        })()}
                                        <h2 className="text-xl lg:text-2xl font-extrabold text-white leading-tight mb-2 group-hover:underline decoration-2 underline-offset-4 transition-all">{heroPost.title}</h2>
                                        {heroPost.excerpt && <p className="text-sm text-white/70 line-clamp-2 max-w-lg">{heroPost.excerpt}</p>}
                                        <div className="flex items-center gap-3 mt-3 text-[11px] text-white/50">
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(heroPost.publishedAt || heroPost.createdAt)}</span>
                                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {heroPost.views || 0}</span>
                                        </div>
                                    </div>
                                </Link>
                            </div>

                            {/* Side Featured */}
                            <div className="lg:col-span-2 flex flex-col gap-3">
                                {sideFeatured.map((post, i) => {
                                    const cat = getCategoryInfo(post);
                                    return (
                                        <Link key={post._id} href={`/tin-tuc/${post.slug}`} className="group flex gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                                            <div className="relative w-[140px] h-[90px] rounded-lg overflow-hidden flex-shrink-0">
                                                {post.coverImage ? (
                                                    <img src={post.coverImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                                        <Newspaper className="w-6 h-6 text-gray-300" />
                                                    </div>
                                                )}
                                                {post.isPinned && (
                                                    <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded bg-red-500 flex items-center justify-center">
                                                        <Pin className="w-2.5 h-2.5 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                <span
                                                    className="text-[10px] font-bold uppercase tracking-wider mb-1"
                                                    style={cat.hexColor ? { color: cat.hexColor } : undefined}
                                                >
                                                    {cat.label}
                                                </span>
                                                <h3 className="text-[13px] font-bold text-gray-900 line-clamp-2 leading-snug group-hover:text-[#1b64f2] transition-colors">{post.title}</h3>
                                                <span className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1.5">
                                                    <Clock className="w-2.5 h-2.5" /> {timeAgo(post.publishedAt || post.createdAt)}
                                                    <span className="mx-0.5">·</span>
                                                    <Eye className="w-2.5 h-2.5" /> {post.views || 0}
                                                </span>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* ===== Main Content ===== */}
            <div className="max-w-[1200px] mx-auto px-4 lg:px-6 py-6">
                <div className="grid lg:grid-cols-3 gap-6">

                    {/* Left: Posts Grid */}
                    <div className="lg:col-span-2">
                        {/* Category Filter */}
                        <div className="flex items-center gap-2 mb-5 overflow-x-auto scrollbar-hide pb-1">
                            <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <button
                                onClick={() => { setCategory(""); setPage(1); }}
                                className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all whitespace-nowrap ${!category
                                    ? "bg-[#1b64f2] text-white shadow-sm"
                                    : "bg-white text-gray-500 hover:text-gray-900 border border-gray-200 hover:border-gray-300"}`}
                            >
                                Tất cả
                            </button>
                            {dbCategories.length > 0 ? (
                                dbCategories.map((cat) => (
                                    <button key={cat._id}
                                        onClick={() => { setCategory(cat.slug); setPage(1); }}
                                        className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all whitespace-nowrap flex items-center gap-1 ${category === cat.slug
                                            ? "text-white shadow-sm"
                                            : "bg-white text-gray-500 hover:text-gray-900 border border-gray-200 hover:border-gray-300"}`}
                                        style={category === cat.slug ? { backgroundColor: cat.color || "#1b64f2" } : undefined}
                                    >
                                        <CategoryIcon name={cat.icon} className="w-3 h-3" />
                                        {cat.name}
                                        {cat.postCount > 0 && (
                                            <span className="text-[9px] opacity-60">({cat.postCount})</span>
                                        )}
                                    </button>
                                ))
                            ) : (
                                Object.entries(fallbackCategories).map(([key, val]) => (
                                    <button key={key}
                                        onClick={() => { setCategory(key); setPage(1); }}
                                        className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all whitespace-nowrap flex items-center gap-1 ${category === key
                                            ? "bg-[#1b64f2] text-white shadow-sm"
                                            : "bg-white text-gray-500 hover:text-gray-900 border border-gray-200 hover:border-gray-300"}`}
                                    >
                                        {val.label}
                                    </button>
                                ))
                            )}
                        </div>

                        {/* Section Title */}
                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="w-1 h-5 rounded-full bg-[#1b64f2]" />
                            <h2 className="text-base font-extrabold text-gray-900 uppercase tracking-tight">
                                {(() => {
                                    if (!category) return "Tất cả bài viết";
                                    const found = dbCategories.find(c => c.slug === category);
                                    return found?.name || fallbackCategories[category]?.label || "Bài viết";
                                })()}
                            </h2>
                        </div>

                        {/* Posts */}
                        {isLoading ? (
                            <div className="flex justify-center py-20">
                                <Loader2 className="w-7 h-7 animate-spin text-[#1b64f2]" />
                            </div>
                        ) : posts.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
                                <Newspaper className="w-14 h-14 text-gray-200 mx-auto mb-3" />
                                <h3 className="text-sm font-bold text-gray-600 mb-1">Chưa có bài viết nào</h3>
                                <p className="text-xs text-gray-400">Hãy quay lại sau để xem tin mới nhất</p>
                            </div>
                        ) : (
                            <>
                                {/* First Post - Large Card */}
                                {posts.length > 0 && (() => {
                                    const first = posts[0];
                                    return (
                                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
                                            <Link href={`/tin-tuc/${first.slug}`} className="group block bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg hover:border-transparent transition-all duration-300">
                                                <div className="grid md:grid-cols-2">
                                                    <div className="relative h-52 md:h-full overflow-hidden">
                                                        {first.coverImage ? (
                                                            <img src={first.coverImage} alt={first.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                                                <Trophy className="w-10 h-10 text-gray-200" />
                                                            </div>
                                                        )}
                                                        {(() => {
                                                            const fCat = getCategoryInfo(first);
                                                            return (
                                                                <div
                                                                    className={`absolute top-3 left-3 px-2 py-0.5 bg-gradient-to-r ${fCat.gradient} text-white text-[10px] font-bold rounded uppercase tracking-wider inline-flex items-center gap-1`}
                                                                >
                                                                    <CategoryIcon name={fCat.iconName} className="w-2.5 h-2.5" />
                                                                    {fCat.label}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                    <div className="p-5 flex flex-col justify-center">
                                                        <h3 className="text-lg font-extrabold text-gray-900 leading-snug mb-2 group-hover:text-[#1b64f2] transition-colors">{first.title}</h3>
                                                        {first.excerpt && <p className="text-sm text-gray-500 line-clamp-3 mb-3 leading-relaxed">{first.excerpt}</p>}
                                                        <div className="flex items-center gap-3 text-[11px] text-gray-400">
                                                            {first.author?.name && (
                                                                <div className="flex items-center gap-1.5">
                                                                    {first.author?.avatar ? (
                                                                        <img src={first.author.avatar} alt="" className="w-4 h-4 rounded-full" />
                                                                    ) : (
                                                                        <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-[7px] font-bold">{first.author.name.charAt(0)}</div>
                                                                    )}
                                                                    <span className="font-medium text-gray-600">{first.author.name}</span>
                                                                </div>
                                                            )}
                                                            <span>·</span>
                                                            <span>{timeAgo(first.publishedAt || first.createdAt)}</span>
                                                            <span>·</span>
                                                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {first.views || 0}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        </motion.div>
                                    );
                                })()}

                                {/* Remaining Posts - Compact List */}
                                <div className="space-y-2.5">
                                    {posts.slice(1).map((post, i) => {
                                        return (
                                            <motion.div key={post._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                                                <Link href={`/tin-tuc/${post.slug}`} className="group flex gap-3.5 p-3 bg-white rounded-lg border border-gray-100 hover:shadow-md hover:border-transparent transition-all duration-300">
                                                    <div className="relative w-[120px] h-[80px] rounded-lg overflow-hidden flex-shrink-0">
                                                        {post.coverImage ? (
                                                            <img src={post.coverImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                                                <Newspaper className="w-5 h-5 text-gray-300" />
                                                            </div>
                                                        )}
                                                        {post.isPinned && (
                                                            <div className="absolute top-1 left-1 w-4 h-4 rounded-sm bg-red-500 flex items-center justify-center">
                                                                <Pin className="w-2 h-2 text-white" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            {(() => {
                                                                const pCat = getCategoryInfo(post);
                                                                return (
                                                                    <span
                                                                        className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded text-white inline-flex items-center gap-0.5`}
                                                                        style={pCat.hexColor ? { backgroundColor: pCat.hexColor } : undefined}
                                                                    >
                                                                        <CategoryIcon name={pCat.iconName} className="w-2.5 h-2.5" />
                                                                        {pCat.label}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </div>
                                                        <h3 className="text-[13px] font-bold text-gray-900 line-clamp-2 leading-snug group-hover:text-[#1b64f2] transition-colors">{post.title}</h3>
                                                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-400">
                                                            <span>{timeAgo(post.publishedAt || post.createdAt)}</span>
                                                            <span>·</span>
                                                            <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" /> {post.views || 0}</span>
                                                            {post.readingTime > 0 && <><span>·</span><span>{post.readingTime} phút đọc</span></>}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center flex-shrink-0">
                                                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#1b64f2] group-hover:translate-x-0.5 transition-all" />
                                                    </div>
                                                </Link>
                                            </motion.div>
                                        );
                                    })}
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-1.5 pt-8 pb-4">
                                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 disabled:opacity-30 transition-all text-xs">
                                            <ChevronLeft className="w-3.5 h-3.5" />
                                        </button>
                                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                                            .filter(p => p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1))
                                            .map((p, idx, arr) => (
                                                <span key={p}>
                                                    {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-gray-300 text-xs">···</span>}
                                                    <button onClick={() => setPage(p)}
                                                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${p === page
                                                            ? "bg-[#1b64f2] text-white shadow-sm"
                                                            : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"}`}>
                                                        {p}
                                                    </button>
                                                </span>
                                            ))}
                                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 disabled:opacity-30 transition-all text-xs">
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Right Sidebar */}
                    <div className="space-y-5">
                        {/* Trending */}
                        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50">
                                <TrendingUp className="w-4 h-4 text-red-500" />
                                <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">Đọc nhiều nhất</h3>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {latest.map((post, i) => (
                                    <Link key={post._id} href={`/tin-tuc/${post.slug}`} className="group flex items-start gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors">
                                        <span className={`text-xl font-black leading-none mt-0.5 flex-shrink-0 ${i < 3 ? "text-[#1b64f2]" : "text-gray-200"}`}>
                                            {String(i + 1).padStart(2, "0")}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-[12px] font-bold text-gray-800 line-clamp-2 leading-snug group-hover:text-[#1b64f2] transition-colors">{post.title}</h4>
                                            <span className="text-[10px] text-gray-400 mt-1 block">{timeAgo(post.publishedAt || post.createdAt)}</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Categories Widget */}
                        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-50">
                                <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">Danh mục</h3>
                            </div>
                            <div className="p-3 space-y-1">
                                {(dbCategories.length > 0 ? dbCategories : Object.entries(fallbackCategories).map(([key, val]) => ({
                                    _id: key,
                                    slug: key,
                                    name: val.label,
                                    gradient: val.gradient,
                                    postCount: 0,
                                }))).map((cat: any) => (
                                    <button key={cat._id}
                                        onClick={() => { setCategory(category === cat.slug ? "" : cat.slug); setPage(1); }}
                                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all ${category === cat.slug ? "bg-[#1b64f2]/5 text-[#1b64f2]" : "text-gray-600 hover:bg-gray-50"}`}
                                    >
                                        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${cat.gradient || "from-blue-500 to-blue-600"} flex items-center justify-center flex-shrink-0`}>
                                            <CategoryIcon name={cat.icon} className="w-3.5 h-3.5 text-white" />
                                        </div>
                                        <span className="text-xs font-semibold flex-1">{cat.name}</span>
                                        {cat.postCount > 0 && (
                                            <span className="text-[10px] text-gray-400 font-medium">{cat.postCount}</span>
                                        )}
                                        <ChevronRight className="w-3 h-3 ml-auto text-gray-300" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tags Cloud */}
                        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-50">
                                <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">Tags phổ biến</h3>
                            </div>
                            <div className="p-3 flex flex-wrap gap-1.5">
                                {["eFootball", "PES", "Giải đấu", "FIFA", "Meta", "Chiến thuật", "Cầu thủ", "Cập nhật", "Mẹo chơi", "Sự kiện"].map(tag => (
                                    <span key={tag} className="px-2.5 py-1 bg-gray-50 text-[10px] font-semibold text-gray-500 rounded-md hover:bg-[#1b64f2]/5 hover:text-[#1b64f2] transition-colors cursor-pointer">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* CTA Banner */}
                        <div className="bg-gradient-to-br from-[#1b64f2] to-[#0d3b8f] rounded-xl p-5 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
                            <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-6 -translate-x-6" />
                            <div className="relative z-10">
                                <Trophy className="w-8 h-8 text-white/20 mb-3" />
                                <h3 className="text-sm font-extrabold mb-1.5">Tham gia giải đấu</h3>
                                <p className="text-[11px] text-blue-100 leading-relaxed mb-4">Đăng ký ngay để thi đấu cùng các game thủ hàng đầu Việt Nam</p>
                                <Link href="/giai-dau" className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-[#1b64f2] text-xs font-bold rounded-lg hover:bg-blue-50 transition-colors">
                                    Xem giải đấu <ArrowRight className="w-3 h-3" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
