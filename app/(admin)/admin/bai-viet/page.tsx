"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    Newspaper, Plus, Search, Edit, Trash2, Eye, Pin,
    Loader2, Calendar, Globe, Megaphone, BookOpen, RefreshCw,
    CheckCircle2, Clock, Send, Star, MoreVertical,
    Image as ImageIcon, FileText, TrendingUp, Filter, ChevronDown,
    FolderTree
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { adminAPI } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { CategoryIcon } from "@/lib/category-icons";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

export default function AdminPostsPage() {
    const [posts, setPosts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("newest");
    const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
    const { confirm } = useConfirmDialog();
    const [categories, setCategories] = useState<any[]>([]);

    // Load categories
    useEffect(() => {
        const loadCats = async () => {
            try {
                const res = await adminAPI.getCategories();
                if (res.success) setCategories(res.data.categories || []);
            } catch (e) { console.error(e); }
        };
        loadCats();
    }, []);

    const loadPosts = async () => {
        setIsLoading(true);
        try {
            const params: Record<string, string> = {};
            if (categoryFilter !== "all") params.category = categoryFilter;
            if (statusFilter !== "all") params.status = statusFilter;
            const res = await adminAPI.getPosts(params);
            if (res.success) setPosts(res.data.posts || []);
        } catch (error) {
            console.error("Load posts error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadPosts(); }, [categoryFilter, statusFilter]);

    const handleDelete = async (postId: string, title: string) => {
        const ok = await confirm({
            title: "Xóa bài viết?",
            description: `Bạn có chắc muốn xóa bài viết "${title}"? Hành động này không thể hoàn tác.`,
            variant: "danger",
            confirmText: "Xóa bài viết",
            cancelText: "Hủy",
        });
        if (!ok) return;
        try {
            const res = await adminAPI.deletePost(postId);
            if (res.success) { toast.success("Đã xóa bài viết"); loadPosts(); }
        } catch (e: any) { toast.error(e.message || "Có lỗi xảy ra"); }
    };

    const handleTogglePin = async (post: any) => {
        try {
            const res = await adminAPI.updatePost(post._id, { isPinned: !post.isPinned });
            if (res.success) { toast.success(post.isPinned ? "Đã bỏ ghim" : "Đã ghim"); loadPosts(); }
        } catch (e: any) { toast.error(e.message || "Có lỗi"); }
    };

    const handleToggleFeatured = async (post: any) => {
        try {
            const res = await adminAPI.updatePost(post._id, { isFeatured: !post.isFeatured });
            if (res.success) { toast.success(post.isFeatured ? "Đã bỏ nổi bật" : "Đã đánh dấu nổi bật"); loadPosts(); }
        } catch (e: any) { toast.error(e.message || "Có lỗi"); }
    };

    const handlePublish = async (post: any) => {
        const newStatus = post.status === "published" ? "draft" : "published";
        try {
            const res = await adminAPI.updatePost(post._id, { status: newStatus });
            if (res.success) { toast.success(newStatus === "published" ? "Đã xuất bản" : "Đã chuyển nháp"); loadPosts(); }
        } catch (e: any) { toast.error(e.message || "Có lỗi"); }
    };

    const handleBulkDelete = async () => {
        const ok = await confirm({
            title: "Xóa nhiều bài viết?",
            description: `Bạn sắp xóa ${selectedPosts.length} bài viết. Hành động này không thể hoàn tác.`,
            variant: "danger",
            confirmText: `Xóa ${selectedPosts.length} bài viết`,
            cancelText: "Hủy",
        });
        if (!ok) return;
        for (const id of selectedPosts) await adminAPI.deletePost(id);
        setSelectedPosts([]);
        toast.success(`Đã xóa ${selectedPosts.length} bài viết`);
        loadPosts();
    };

    const filteredPosts = posts
        .filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()) || (p.excerpt || "").toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
            if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            if (sortBy === "views") return (b.views || 0) - (a.views || 0);
            if (sortBy === "title") return a.title.localeCompare(b.title);
            return 0;
        });

    const totalPosts = posts.length;
    const publishedCount = posts.filter(p => p.status === "published").length;
    const draftCount = posts.filter(p => p.status === "draft").length;
    const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-foreground">Quản lý bài viết</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Tạo và quản lý nội dung trên website</p>
                </div>
                <Link href="/admin/bai-viet/tao-moi">
                    <Button size="sm" className="gap-2">
                        <Plus className="w-4 h-4" /> Tạo bài viết
                    </Button>
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: "Tổng bài viết", value: totalPosts, icon: FileText, color: "text-blue-600" },
                    { label: "Đã xuất bản", value: publishedCount, icon: Globe, color: "text-emerald-600" },
                    { label: "Bản nháp", value: draftCount, icon: Clock, color: "text-muted-foreground" },
                    { label: "Tổng lượt xem", value: totalViews.toLocaleString(), icon: TrendingUp, color: "text-purple-600" },
                ].map((stat, i) => (
                    <Card key={stat.label}>
                        <CardContent className="flex items-center gap-3 py-3 px-4">
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                            <div>
                                <div className="text-lg font-bold">{stat.value}</div>
                                <div className="text-[11px] text-muted-foreground">{stat.label}</div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="py-3 px-4 space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm bài viết..." className="pl-9" />
                        </div>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Danh mục" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả danh mục</SelectItem>
                                {categories.map(cat => (
                                    <SelectItem key={cat._id} value={cat.slug || cat._id}>
                                        <div className="flex items-center gap-1.5">
                                            <CategoryIcon name={cat.icon} className="w-3 h-3" />
                                            {cat.name}
                                        </div>
                                    </SelectItem>
                                ))}
                                {categories.length === 0 && (
                                    <>
                                        <SelectItem value="news">Tin tức</SelectItem>
                                        <SelectItem value="announcement">Thông báo</SelectItem>
                                        <SelectItem value="guide">Hướng dẫn</SelectItem>
                                        <SelectItem value="update">Cập nhật</SelectItem>
                                    </>
                                )}
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả</SelectItem>
                                <SelectItem value="draft">Nháp</SelectItem>
                                <SelectItem value="published">Đã xuất bản</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Sắp xếp" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="newest">Mới nhất</SelectItem>
                                <SelectItem value="oldest">Cũ nhất</SelectItem>
                                <SelectItem value="views">Lượt xem</SelectItem>
                                <SelectItem value="title">Tên A-Z</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedPosts.length > 0 && (
                        <>
                            <Separator />
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground">Đã chọn {selectedPosts.length}</span>
                                <Button size="sm" variant="outline" onClick={() => setSelectedPosts([])} className="h-7 text-xs">Bỏ chọn</Button>
                                <Button size="sm" variant="destructive" onClick={handleBulkDelete} className="h-7 text-xs gap-1">
                                    <Trash2 className="w-3 h-3" /> Xóa đã chọn
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Posts */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : filteredPosts.length === 0 ? (
                <Card>
                    <CardContent className="text-center py-16">
                        <Newspaper className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                        <h3 className="text-base font-semibold mb-1">Chưa có bài viết</h3>
                        <p className="text-sm text-muted-foreground mb-4">Bắt đầu tạo bài viết đầu tiên</p>
                        <Link href="/admin/bai-viet/tao-moi">
                            <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Tạo bài viết</Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {filteredPosts.map((post, i) => {
                        const isSelected = selectedPosts.includes(post._id);
                        return (
                            <motion.div key={post._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                                <Card className={`group hover:shadow-md transition-shadow ${isSelected ? "ring-2 ring-primary" : ""}`}>
                                    <CardContent className="py-3 px-4">
                                        <div className="flex items-start gap-3">
                                            {/* Checkbox */}
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={(checked) => {
                                                    if (checked) setSelectedPosts(prev => [...prev, post._id]);
                                                    else setSelectedPosts(prev => prev.filter(id => id !== post._id));
                                                }}
                                                className="mt-1"
                                            />

                                            {/* Cover */}
                                            {post.coverImage ? (
                                                <div className="w-20 h-14 rounded-md overflow-hidden flex-shrink-0 border bg-muted">
                                                    <img src={post.coverImage} alt="" className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="w-20 h-14 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                                                    <ImageIcon className="w-5 h-5 text-muted-foreground/30" />
                                                </div>
                                            )}

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    {post.isPinned && <Pin className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                                                    {post.isFeatured && <Star className="w-3 h-3 text-yellow-500 flex-shrink-0 fill-yellow-500" />}
                                                    <Link href={`/admin/bai-viet/${post._id}/chinh-sua`} className="text-sm font-medium truncate hover:text-primary transition-colors">
                                                        {post.title}
                                                    </Link>
                                                </div>
                                                {post.excerpt && <p className="text-xs text-muted-foreground line-clamp-1 mb-1.5">{post.excerpt}</p>}
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {(() => {
                                                        const catData = categories.find(c => c.slug === post.category || c._id === post.categoryRef?._id || c._id === post.categoryRef);
                                                        return (
                                                            <Badge
                                                                style={catData ? { backgroundColor: catData.color, color: "#fff" } : undefined}
                                                                variant={catData ? undefined : "default"}
                                                                className="text-[10px] border-0"
                                                            >
                                                                {catData?.name || post.category || "Chưa phân loại"}
                                                            </Badge>
                                                        );
                                                    })()}
                                                    <Badge variant={post.status === "published" ? "default" : "secondary"} className="text-[10px]">
                                                        {post.status === "published" ? "Đã xuất bản" : "Nháp"}
                                                    </Badge>
                                                    <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Eye className="w-3 h-3" /> {post.views || 0}</span>
                                                    <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> {post.createdAt ? format(new Date(post.createdAt), "dd/MM/yyyy HH:mm") : ""}</span>
                                                    {post.readingTime > 0 && <span className="text-[11px] text-muted-foreground">{post.readingTime} phút đọc</span>}
                                                    {post.author?.name && <span className="text-[11px] text-muted-foreground">bởi {post.author.name}</span>}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                <Button variant="ghost" size="sm" onClick={() => handlePublish(post)}
                                                    className={`h-8 w-8 p-0 ${post.status === "published" ? "text-amber-500" : "text-emerald-600"}`}
                                                    title={post.status === "published" ? "Chuyển nháp" : "Xuất bản"}>
                                                    {post.status === "published" ? <Clock className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="w-4 h-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-44">
                                                        <DropdownMenuItem asChild className="cursor-pointer">
                                                            <Link href={`/admin/bai-viet/${post._id}/chinh-sua`}><Edit className="w-3.5 h-3.5 mr-2" /> Chỉnh sửa</Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleTogglePin(post)} className="cursor-pointer">
                                                            <Pin className={`w-3.5 h-3.5 mr-2 ${post.isPinned ? "text-amber-500" : ""}`} /> {post.isPinned ? "Bỏ ghim" : "Ghim"}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleToggleFeatured(post)} className="cursor-pointer">
                                                            <Star className={`w-3.5 h-3.5 mr-2 ${post.isFeatured ? "text-yellow-500" : ""}`} /> {post.isFeatured ? "Bỏ nổi bật" : "Nổi bật"}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleDelete(post._id, post.title)} className="text-destructive cursor-pointer">
                                                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Xóa
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
