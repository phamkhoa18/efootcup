"use client";

import { useState, useEffect, useRef, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
    ArrowLeft, Save, Send, Clock, Upload, X, Plus,
    Loader2, Image as ImageIcon, Globe, Megaphone, BookOpen,
    RefreshCw, Pin, Star, Newspaper, Search as SearchIcon,
    FileText, Hash, Code, AlertCircle,
    Trash2, CalendarIcon, History, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { adminAPI } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

const TiptapEditor = dynamic(() => import("@/components/admin/TiptapEditor"), { ssr: false });

const categoryOptions = [
    { value: "news", label: "Tin tức", icon: Newspaper, desc: "Bài viết thời sự, tin mới" },
    { value: "announcement", label: "Thông báo", icon: Megaphone, desc: "Thông báo chính thức" },
    { value: "guide", label: "Hướng dẫn", icon: BookOpen, desc: "Bài hướng dẫn, tutorial" },
    { value: "update", label: "Cập nhật", icon: RefreshCw, desc: "Cập nhật hệ thống" },
];

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const { confirm } = useConfirmDialog();

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
    const [postMeta, setPostMeta] = useState<any>(null);

    const [form, setForm] = useState({
        title: "",
        content: "",
        excerpt: "",
        category: "news",
        status: "draft" as string,
        tags: "",
        isPinned: false,
        isFeatured: false,
        coverImage: "",
        gallery: [] as string[],
        seo: {
            metaTitle: "",
            metaDescription: "",
            metaKeywords: "",
            ogImage: "",
            ogTitle: "",
            ogDescription: "",
            canonicalUrl: "",
            noIndex: false,
            structuredData: "",
        },
    });

    useEffect(() => {
        loadPost();
    }, [id]);

    const loadPost = async () => {
        setIsLoading(true);
        try {
            const res = await adminAPI.getPost(id);
            if (res.success) {
                const post = res.data.post;
                setPostMeta(post);
                setForm({
                    title: post.title || "",
                    content: post.content || "",
                    excerpt: post.excerpt || "",
                    category: post.category || "news",
                    status: post.status || "draft",
                    tags: (post.tags || []).join(", "),
                    isPinned: post.isPinned || false,
                    isFeatured: post.isFeatured || false,
                    coverImage: post.coverImage || "",
                    gallery: post.gallery || [],
                    seo: {
                        metaTitle: post.seo?.metaTitle || "",
                        metaDescription: post.seo?.metaDescription || "",
                        metaKeywords: (post.seo?.metaKeywords || []).join(", "),
                        ogImage: post.seo?.ogImage || "",
                        ogTitle: post.seo?.ogTitle || "",
                        ogDescription: post.seo?.ogDescription || "",
                        canonicalUrl: post.seo?.canonicalUrl || "",
                        noIndex: post.seo?.noIndex || false,
                        structuredData: post.seo?.structuredData || "",
                    },
                });
                if (post.scheduledAt) setScheduledDate(new Date(post.scheduledAt));
            } else {
                toast.error("Không tìm thấy bài viết");
                router.push("/admin/bai-viet");
            }
        } catch {
            toast.error("Có lỗi khi tải bài viết");
            router.push("/admin/bai-viet");
        } finally {
            setIsLoading(false);
        }
    };

    const updateForm = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));
    const updateSEO = (key: string, value: any) => setForm(prev => ({ ...prev, seo: { ...prev.seo, [key]: value } }));

    const handleImageUpload = async (file: File, type: "cover" | "gallery" | "content") => {
        setIsUploading(true);
        try {
            const res = await adminAPI.uploadContentImage(file, type);
            if (res.success) {
                const url = res.data.url;
                if (type === "cover") updateForm("coverImage", url);
                else if (type === "gallery") setForm(prev => ({ ...prev, gallery: [...prev.gallery, url] }));
                toast.success("Upload thành công!");
                return url;
            } else { toast.error(res.message || "Upload thất bại"); return null; }
        } catch (e: any) { toast.error(e.message || "Có lỗi upload"); return null; }
        finally { setIsUploading(false); }
    };

    const handleEditorImageUpload = useCallback(async (file: File): Promise<string | null> => {
        setIsUploading(true);
        try {
            const res = await adminAPI.uploadContentImage(file, "content");
            if (res.success) { toast.success("Upload ảnh thành công!"); return res.data.url; }
            toast.error(res.message || "Upload thất bại"); return null;
        } catch (e: any) { toast.error(e.message || "Có lỗi upload"); return null; }
        finally { setIsUploading(false); }
    }, []);

    const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, "cover"); };
    const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => { const fs = e.target.files; if (fs) Array.from(fs).forEach(f => handleImageUpload(f, "gallery")); };
    const removeGalleryImage = (i: number) => setForm(prev => ({ ...prev, gallery: prev.gallery.filter((_, idx) => idx !== i) }));

    const autoFillSEO = () => {
        updateSEO("metaTitle", form.title); updateSEO("ogTitle", form.title);
        const desc = form.excerpt || form.content.replace(/<[^>]*>/g, "").substring(0, 160);
        updateSEO("metaDescription", desc); updateSEO("ogDescription", desc);
        if (form.coverImage) updateSEO("ogImage", form.coverImage);
        if (form.tags) updateSEO("metaKeywords", form.tags);
        toast.success("Đã tự động điền SEO");
    };

    const plainText = form.content.replace(/<[^>]*>/g, "").replace(/[#*_~`\[\]()>-]/g, "").trim();
    const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));
    const seoTitleLen = (form.seo.metaTitle || form.title).length;
    const seoDescLen = (form.seo.metaDescription || form.excerpt).length;

    const handleSubmit = async (publishNow: boolean = false) => {
        if (!form.title.trim() || !form.content.trim()) { toast.error("Vui lòng nhập tiêu đề và nội dung"); return; }
        setIsSubmitting(true);
        try {
            const payload = {
                ...form, status: publishNow ? "published" : form.status,
                tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
                seo: { ...form.seo, metaKeywords: form.seo.metaKeywords.split(",").map(t => t.trim()).filter(Boolean) },
                scheduledAt: scheduledDate ? scheduledDate.toISOString() : undefined,
            };
            const res = await adminAPI.updatePost(id, payload);
            if (res.success) { toast.success(publishNow ? "Đã xuất bản!" : "Đã cập nhật!"); router.push("/admin/bai-viet"); }
            else toast.error(res.message || "Có lỗi xảy ra");
        } catch (e: any) { toast.error(e.message || "Có lỗi xảy ra"); }
        finally { setIsSubmitting(false); }
    };

    const handleDelete = async () => {
        const ok = await confirm({
            title: "Xóa bài viết?",
            description: "Bạn có chắc muốn xóa bài viết này? Hành động này không thể hoàn tác.",
            variant: "danger",
            confirmText: "Xóa vĩnh viễn",
        });
        if (!ok) return;
        try {
            const res = await adminAPI.deletePost(id);
            if (res.success) { toast.success("Đã xóa bài viết"); router.push("/admin/bai-viet"); }
        } catch (e: any) { toast.error(e.message || "Có lỗi xảy ra"); }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Đang tải bài viết...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/admin/bai-viet">
                        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="w-4 h-4" /> Quay lại
                        </Button>
                    </Link>
                    <Separator orientation="vertical" className="h-6" />
                    <div>
                        <h1 className="text-lg font-bold text-foreground">Chỉnh sửa bài viết</h1>
                        <p className="text-xs text-muted-foreground">
                            {wordCount} từ · {readingTime} phút đọc
                            {postMeta?.updatedAt && <> · Cập nhật lần cuối: {format(new Date(postMeta.updatedAt), "dd/MM/yyyy HH:mm")}</>}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleDelete} className="gap-2 text-destructive hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" /> Xóa
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleSubmit(false)} disabled={isSubmitting} className="gap-2">
                        {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Lưu
                    </Button>
                    <Button size="sm" onClick={() => handleSubmit(true)} disabled={isSubmitting} className="gap-2">
                        {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Xuất bản
                    </Button>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-5">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Title */}
                    <Card>
                        <CardContent className="pt-5 pb-4">
                            <Input value={form.title} onChange={(e) => updateForm("title", e.target.value)} placeholder="Tiêu đề bài viết..." className="text-xl font-bold border-0 p-0 h-auto shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/40" />
                        </CardContent>
                    </Card>

                    {/* Tabs */}
                    <Tabs defaultValue="content" className="w-full">
                        <TabsList className="w-full">
                            <TabsTrigger value="content" className="flex-1 gap-2"><FileText className="w-4 h-4" /> Nội dung</TabsTrigger>
                            <TabsTrigger value="media" className="flex-1 gap-2"><ImageIcon className="w-4 h-4" /> Media</TabsTrigger>
                            <TabsTrigger value="seo" className="flex-1 gap-2"><SearchIcon className="w-4 h-4" /> SEO</TabsTrigger>
                        </TabsList>

                        {/* Content Tab */}
                        <TabsContent value="content" className="space-y-4 mt-4">
                            <Card>
                                <CardHeader className="pb-3"><CardTitle className="text-sm">Tóm tắt / Mô tả ngắn</CardTitle></CardHeader>
                                <CardContent className="space-y-2">
                                    <Textarea value={form.excerpt} onChange={(e) => updateForm("excerpt", e.target.value)} placeholder="Viết tóm tắt ngắn gọn..." rows={3} className="resize-none" />
                                    <p className="text-[11px] text-muted-foreground text-right">{form.excerpt.length}/500</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm">Nội dung bài viết</CardTitle>
                                        <span className="text-[11px] text-muted-foreground">{wordCount} từ · ~{readingTime} phút đọc</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 pb-0">
                                    <TiptapEditor
                                        content={form.content}
                                        onChange={(html) => updateForm("content", html)}
                                        onImageUpload={handleEditorImageUpload}
                                        isUploading={isUploading}
                                        placeholder="Viết nội dung bài viết..."
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Media Tab */}
                        <TabsContent value="media" className="space-y-4 mt-4">
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm">Ảnh bìa</CardTitle>
                                    <CardDescription>Kích thước khuyến nghị: 1200×630px</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {form.coverImage ? (
                                        <div className="relative rounded-lg overflow-hidden border group">
                                            <img src={form.coverImage} alt="Cover" className="w-full h-56 object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}><Upload className="w-3.5 h-3.5 mr-1.5" /> Thay đổi</Button>
                                                <Button size="sm" variant="destructive" onClick={() => updateForm("coverImage", "")}><Trash2 className="w-3.5 h-3.5 mr-1.5" /> Xóa</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button onClick={() => fileInputRef.current?.click()} className="w-full h-44 rounded-lg border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 flex flex-col items-center justify-center gap-3 transition-colors group">
                                            {isUploading ? <Loader2 className="w-8 h-8 text-primary animate-spin" /> : (<>
                                                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors"><Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" /></div>
                                                <p className="text-sm font-medium text-muted-foreground group-hover:text-primary">Nhấn để tải ảnh bìa</p>
                                                <p className="text-[11px] text-muted-foreground/60">JPG, PNG, WebP, GIF · Tối đa 10MB</p>
                                            </>)}
                                        </button>
                                    )}
                                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverSelect} />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div><CardTitle className="text-sm">Thư viện ảnh</CardTitle><CardDescription>{form.gallery.length} ảnh</CardDescription></div>
                                        <Button variant="outline" size="sm" onClick={() => galleryInputRef.current?.click()} className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Thêm</Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGallerySelect} />
                                    {form.gallery.length > 0 ? (
                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                            {form.gallery.map((url, i) => (
                                                <div key={i} className="relative group rounded-lg overflow-hidden border aspect-square">
                                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                                    <button onClick={() => removeGalleryImage(i)} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"><X className="w-3 h-3" /></button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-center py-8 text-sm text-muted-foreground">Chưa có ảnh</p>}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* SEO Tab */}
                        <TabsContent value="seo" className="space-y-4 mt-4">
                            <Card>
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm">Xem trước Google</CardTitle>
                                        <Button variant="outline" size="sm" onClick={autoFillSEO} className="gap-1.5 text-xs"><RefreshCw className="w-3 h-3" /> Tự động điền</Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="p-4 rounded-lg bg-muted/50 border space-y-1">
                                        <p className="text-sm text-blue-700 font-medium truncate">{form.seo.metaTitle || form.title || "Tiêu đề"}</p>
                                        <p className="text-xs text-emerald-700 truncate">efootball.vn/bai-viet/{postMeta?.slug || "slug"}</p>
                                        <p className="text-xs text-muted-foreground line-clamp-2">{form.seo.metaDescription || form.excerpt || "Mô tả..."}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><SearchIcon className="w-4 h-4 text-primary" /> Meta Tags</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between"><Label className="text-xs">Meta Title</Label><Badge variant={seoTitleLen > 60 ? "destructive" : seoTitleLen > 50 ? "outline" : "secondary"} className="text-[10px]">{seoTitleLen}/60</Badge></div>
                                        <Input value={form.seo.metaTitle} onChange={(e) => updateSEO("metaTitle", e.target.value)} placeholder="Meta title (max 60)" />
                                        {seoTitleLen > 60 && <p className="text-[11px] text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Tiêu đề quá dài</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between"><Label className="text-xs">Meta Description</Label><Badge variant={seoDescLen > 160 ? "destructive" : seoDescLen > 140 ? "outline" : "secondary"} className="text-[10px]">{seoDescLen}/160</Badge></div>
                                        <Textarea value={form.seo.metaDescription} onChange={(e) => updateSEO("metaDescription", e.target.value)} placeholder="Meta description (max 160)" rows={3} className="resize-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">Meta Keywords</Label>
                                        <Input value={form.seo.metaKeywords} onChange={(e) => updateSEO("metaKeywords", e.target.value)} placeholder="efootball, cup, giải đấu" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Open Graph</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2"><Label className="text-xs">OG Title</Label><Input value={form.seo.ogTitle} onChange={(e) => updateSEO("ogTitle", e.target.value)} placeholder="Tiêu đề chia sẻ" /></div>
                                    <div className="space-y-2"><Label className="text-xs">OG Description</Label><Textarea value={form.seo.ogDescription} onChange={(e) => updateSEO("ogDescription", e.target.value)} placeholder="Mô tả chia sẻ" rows={2} className="resize-none" /></div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">OG Image URL</Label>
                                        <Input value={form.seo.ogImage} onChange={(e) => updateSEO("ogImage", e.target.value)} placeholder="URL ảnh OG (1200×630px)" />
                                        {(form.seo.ogImage || form.coverImage) && <div className="rounded-lg overflow-hidden border mt-2"><img src={form.seo.ogImage || form.coverImage} alt="OG" className="w-full h-36 object-cover" /></div>}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Code className="w-4 h-4 text-primary" /> Nâng cao</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2"><Label className="text-xs">Canonical URL</Label><Input value={form.seo.canonicalUrl} onChange={(e) => updateSEO("canonicalUrl", e.target.value)} placeholder="https://efootball.vn/..." /></div>
                                    <div className="flex items-center justify-between">
                                        <div><Label className="text-sm">noIndex</Label><p className="text-[11px] text-muted-foreground">Ẩn khỏi Google</p></div>
                                        <Switch checked={form.seo.noIndex} onCheckedChange={(val) => updateSEO("noIndex", val)} />
                                    </div>
                                    <div className="space-y-2"><Label className="text-xs">Structured Data (JSON-LD)</Label><Textarea value={form.seo.structuredData} onChange={(e) => updateSEO("structuredData", e.target.value)} placeholder='{"@context":"https://schema.org",...}' rows={4} className="font-mono text-xs resize-none" /></div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-4">
                    {/* Post Info */}
                    {postMeta && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2"><History className="w-4 h-4 text-muted-foreground" /> Thông tin</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-xs">
                                <div className="flex justify-between"><span className="text-muted-foreground">Tạo lúc:</span><span className="font-medium">{format(new Date(postMeta.createdAt), "dd/MM/yyyy HH:mm")}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Cập nhật:</span><span className="font-medium">{format(new Date(postMeta.updatedAt), "dd/MM/yyyy HH:mm")}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Lượt xem:</span><span className="font-medium">{postMeta.views || 0}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Slug:</span><span className="font-medium truncate max-w-[140px]">{postMeta.slug}</span></div>
                                {postMeta.author?.name && <div className="flex justify-between"><span className="text-muted-foreground">Tác giả:</span><span className="font-medium">{postMeta.author.name}</span></div>}
                            </CardContent>
                        </Card>
                    )}

                    {/* Publish Settings */}
                    <Card className="sticky top-24">
                        <CardHeader className="pb-3"><CardTitle className="text-sm">Cài đặt xuất bản</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs">Trạng thái</Label>
                                <Select value={form.status} onValueChange={(val) => updateForm("status", val)}>
                                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft"><div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Nháp</div></SelectItem>
                                        <SelectItem value="published"><div className="flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Xuất bản</div></SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs">Lên lịch xuất bản</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal gap-2 h-9 text-sm">
                                            <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                            {scheduledDate ? format(scheduledDate, "dd/MM/yyyy", { locale: vi }) : <span className="text-muted-foreground">Chọn ngày...</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={scheduledDate} onSelect={setScheduledDate} /></PopoverContent>
                                </Popover>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <Label className="text-xs">Danh mục</Label>
                                <Select value={form.category} onValueChange={(val) => updateForm("category", val)}>
                                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {categoryOptions.map(cat => (
                                            <SelectItem key={cat.value} value={cat.value}>
                                                <div className="flex items-center gap-2"><cat.icon className="w-3.5 h-3.5" /> {cat.label}</div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs flex items-center gap-1"><Hash className="w-3 h-3" /> Tags</Label>
                                <Input value={form.tags} onChange={(e) => updateForm("tags", e.target.value)} placeholder="efootball, giải đấu" className="h-9 text-sm" />
                            </div>

                            <Separator />

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2"><Pin className="w-3.5 h-3.5 text-amber-500" /><Label className="text-sm cursor-pointer">Ghim</Label></div>
                                    <Switch checked={form.isPinned} onCheckedChange={(val) => updateForm("isPinned", val)} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2"><Star className="w-3.5 h-3.5 text-yellow-500" /><Label className="text-sm cursor-pointer">Nổi bật</Label></div>
                                    <Switch checked={form.isFeatured} onCheckedChange={(val) => updateForm("isFeatured", val)} />
                                </div>
                            </div>

                            {form.coverImage && (
                                <>
                                    <Separator />
                                    <div className="rounded-lg overflow-hidden border"><img src={form.coverImage} alt="" className="w-full h-20 object-cover" /></div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
