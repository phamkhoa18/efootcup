"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FolderTree, Plus, Search, Edit, Trash2, Loader2,
    Eye, EyeOff, X, Check, Palette,
    Hash, ArrowUp, ArrowDown, Save,
    FileText, Layers, Sparkles
} from "lucide-react";
import { icons as allLucideIcons, type LucideIcon } from "lucide-react";
import { CategoryIcon, getCategoryIcon } from "@/lib/category-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { adminAPI } from "@/lib/api";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

// Get all Lucide icon names
const allIconNames = Object.keys(allLucideIcons).filter(
    // Filter out non-icon exports (createLucideIcon, etc.)
    name => name[0] === name[0].toUpperCase() && name !== "IconNode" && name !== "LucideIcon" && !name.startsWith("create")
);

// Convert PascalCase to readable label
const iconToLabel = (name: string) => name.replace(/([A-Z])/g, " $1").trim();

// Color presets
const colorPresets = [
    { color: "#1b64f2", gradient: "from-blue-500 to-blue-600", label: "Xanh dương" },
    { color: "#ef4444", gradient: "from-red-500 to-rose-600", label: "Đỏ" },
    { color: "#f59e0b", gradient: "from-amber-500 to-orange-500", label: "Cam" },
    { color: "#10b981", gradient: "from-emerald-500 to-teal-500", label: "Xanh lá" },
    { color: "#8b5cf6", gradient: "from-purple-500 to-violet-500", label: "Tím" },
    { color: "#ec4899", gradient: "from-pink-500 to-rose-500", label: "Hồng" },
    { color: "#06b6d4", gradient: "from-cyan-500 to-sky-500", label: "Cyan" },
    { color: "#84cc16", gradient: "from-lime-500 to-green-500", label: "Xanh lục" },
    { color: "#f97316", gradient: "from-orange-500 to-red-500", label: "Cháy" },
    { color: "#6366f1", gradient: "from-indigo-500 to-blue-600", label: "Indigo" },
];

interface CategoryForm {
    name: string;
    description: string;
    icon: string;
    color: string;
    gradient: string;
    isActive: boolean;
    parent: string;
    order: number;
}

const defaultForm: CategoryForm = {
    name: "",
    description: "",
    icon: "Newspaper",
    color: "#1b64f2",
    gradient: "from-blue-500 to-blue-600",
    isActive: true,
    parent: "",
    order: 0,
};

export default function AdminCategoriesPage() {
    const [categories, setCategories] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<CategoryForm>({ ...defaultForm });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [iconSearch, setIconSearch] = useState("");
    const [iconPage, setIconPage] = useState(1);
    const ICONS_PER_PAGE = 72;

    useEffect(() => { loadCategories(); }, []);

    const loadCategories = async () => {
        setIsLoading(true);
        try {
            const res = await adminAPI.getCategories();
            if (res.success) setCategories(res.data.categories || []);
        } catch (error) {
            console.error("Load categories error:", error);
            toast.error("Không thể tải danh mục");
        } finally {
            setIsLoading(false);
        }
    };

    const openCreateDialog = () => {
        setEditingId(null);
        setForm({ ...defaultForm });
        setIconSearch("");
        setIconPage(1);
        setDialogOpen(true);
    };

    const openEditDialog = (cat: any) => {
        setEditingId(cat._id);
        setForm({
            name: cat.name || "",
            description: cat.description || "",
            icon: cat.icon || "Newspaper",
            color: cat.color || "#1b64f2",
            gradient: cat.gradient || "from-blue-500 to-blue-600",
            isActive: cat.isActive !== false,
            parent: cat.parent?._id || "",
            order: cat.order || 0,
        });
        setIconSearch("");
        setIconPage(1);
        setDialogOpen(true);
    };

    // Filtered icons with memoization for performance
    const filteredIcons = useMemo(() => {
        if (!iconSearch.trim()) return allIconNames;
        const q = iconSearch.toLowerCase();
        return allIconNames.filter(name => {
            const label = iconToLabel(name).toLowerCase();
            return name.toLowerCase().includes(q) || label.includes(q);
        });
    }, [iconSearch]);

    const visibleIcons = filteredIcons.slice(0, iconPage * ICONS_PER_PAGE);
    const hasMore = visibleIcons.length < filteredIcons.length;

    const handleSubmit = async () => {
        if (!form.name.trim()) {
            toast.error("Vui lòng nhập tên danh mục");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                ...form,
                parent: form.parent || undefined,
            };

            let res;
            if (editingId) {
                res = await adminAPI.updateCategory(editingId, payload);
            } else {
                res = await adminAPI.createCategory(payload);
            }

            if (res.success) {
                toast.success(editingId ? "Đã cập nhật danh mục" : "Đã tạo danh mục mới");
                setDialogOpen(false);
                loadCategories();
            } else {
                toast.error(res.message || "Có lỗi xảy ra");
            }
        } catch (e: any) {
            toast.error(e.message || "Có lỗi xảy ra");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (catId: string) => {
        try {
            const res = await adminAPI.deleteCategory(catId);
            if (res.success) {
                toast.success("Đã xóa danh mục");
                setDeleteConfirmId(null);
                loadCategories();
            } else {
                toast.error(res.message || "Không thể xóa");
            }
        } catch (e: any) {
            toast.error(e.message || "Có lỗi xảy ra");
        }
    };

    const handleToggleActive = async (cat: any) => {
        try {
            const res = await adminAPI.updateCategory(cat._id, { isActive: !cat.isActive });
            if (res.success) {
                toast.success(cat.isActive ? "Đã ẩn danh mục" : "Đã hiện danh mục");
                loadCategories();
            }
        } catch (e: any) {
            toast.error(e.message || "Có lỗi");
        }
    };

    const handleReorder = async (catId: string, direction: "up" | "down") => {
        const idx = filteredCategories.findIndex(c => c._id === catId);
        if (idx < 0) return;
        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= filteredCategories.length) return;

        try {
            const cat = filteredCategories[idx];
            const swapCat = filteredCategories[swapIdx];
            await adminAPI.updateCategory(cat._id, { order: swapCat.order });
            await adminAPI.updateCategory(swapCat._id, { order: cat.order });
            loadCategories();
        } catch (e: any) {
            toast.error("Có lỗi khi thay đổi thứ tự");
        }
    };

    const setColorPreset = (preset: typeof colorPresets[0]) => {
        setForm(prev => ({ ...prev, color: preset.color, gradient: preset.gradient }));
    };

    const filteredCategories = categories.filter(
        c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.description || "").toLowerCase().includes(search.toLowerCase())
    );

    const parentCategories = categories.filter(c => !c.parent);
    const totalPosts = categories.reduce((sum, c) => sum + (c.postCount || 0), 0);
    const activeCount = categories.filter(c => c.isActive).length;

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <FolderTree className="w-5 h-5 text-primary" />
                        Quản lý danh mục
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Tạo và quản lý danh mục cho bài viết tin tức</p>
                </div>
                <Button size="sm" className="gap-2" onClick={openCreateDialog}>
                    <Plus className="w-4 h-4" /> Tạo danh mục
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: "Tổng danh mục", value: categories.length, icon: FolderTree, color: "text-blue-600" },
                    { label: "Đang hoạt động", value: activeCount, icon: Eye, color: "text-emerald-600" },
                    { label: "Tổng bài viết", value: totalPosts, icon: FileText, color: "text-purple-600" },
                    { label: "Danh mục cha", value: parentCategories.length, icon: Layers, color: "text-amber-600" },
                ].map((stat) => (
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

            {/* Search */}
            <Card>
                <CardContent className="py-3 px-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Tìm kiếm danh mục..."
                            className="pl-9"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Categories List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : filteredCategories.length === 0 ? (
                <Card>
                    <CardContent className="text-center py-16">
                        <FolderTree className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                        <h3 className="text-base font-semibold mb-1">Chưa có danh mục</h3>
                        <p className="text-sm text-muted-foreground mb-4">Bắt đầu tạo danh mục đầu tiên cho bài viết</p>
                        <Button size="sm" className="gap-2" onClick={openCreateDialog}>
                            <Plus className="w-4 h-4" /> Tạo danh mục
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {filteredCategories.map((cat, i) => {
                        const isDeleting = deleteConfirmId === cat._id;

                        return (
                            <motion.div
                                key={cat._id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                            >
                                <Card className={`group hover:shadow-md transition-all ${!cat.isActive ? "opacity-60" : ""}`}>
                                    <CardContent className="py-3 px-4">
                                        <div className="flex items-center gap-3">
                                            {/* Reorder Buttons */}
                                            <div className="flex flex-col gap-0.5 flex-shrink-0">
                                                <button
                                                    onClick={() => handleReorder(cat._id, "up")}
                                                    disabled={i === 0}
                                                    className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-20 transition-all"
                                                >
                                                    <ArrowUp className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() => handleReorder(cat._id, "down")}
                                                    disabled={i === filteredCategories.length - 1}
                                                    className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-20 transition-all"
                                                >
                                                    <ArrowDown className="w-3 h-3" />
                                                </button>
                                            </div>

                                            {/* Icon */}
                                            <div
                                                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cat.gradient || "from-blue-500 to-blue-600"} flex items-center justify-center flex-shrink-0 shadow-sm`}
                                            >
                                                <CategoryIcon name={cat.icon} className="w-5 h-5 text-white" />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-sm font-semibold text-foreground truncate">{cat.name}</span>
                                                    {cat.parent && (
                                                        <Badge variant="outline" className="text-[10px]">
                                                            con của {cat.parent.name}
                                                        </Badge>
                                                    )}
                                                    {!cat.isActive && (
                                                        <Badge variant="secondary" className="text-[10px]">
                                                            <EyeOff className="w-2.5 h-2.5 mr-1" /> Ẩn
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                                    {cat.description && (
                                                        <span className="truncate max-w-[300px]">{cat.description}</span>
                                                    )}
                                                    <span className="flex items-center gap-1 flex-shrink-0">
                                                        <FileText className="w-3 h-3" />
                                                        {cat.postCount || 0} bài viết
                                                    </span>
                                                    <span className="flex items-center gap-1 flex-shrink-0">
                                                        <Hash className="w-3 h-3" />
                                                        {cat.slug}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Color Preview */}
                                            <div
                                                className="w-6 h-6 rounded-full flex-shrink-0 border-2 border-white shadow-sm"
                                                style={{ backgroundColor: cat.color || "#1b64f2" }}
                                                title={`Màu: ${cat.color}`}
                                            />

                                            {/* Actions */}
                                            <AnimatePresence mode="wait">
                                                {isDeleting ? (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.9 }}
                                                        className="flex items-center gap-2 flex-shrink-0"
                                                    >
                                                        <span className="text-xs text-destructive font-medium">Xóa?</span>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            className="h-7 text-xs gap-1"
                                                            onClick={() => handleDelete(cat._id)}
                                                        >
                                                            <Check className="w-3 h-3" /> Xác nhận
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 text-xs"
                                                            onClick={() => setDeleteConfirmId(null)}
                                                        >
                                                            Hủy
                                                        </Button>
                                                    </motion.div>
                                                ) : (
                                                    <motion.div
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                                    >
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0"
                                                            onClick={() => openEditDialog(cat)}
                                                            title="Chỉnh sửa"
                                                        >
                                                            <Edit className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className={`h-8 w-8 p-0 ${cat.isActive ? "text-emerald-600" : "text-muted-foreground"}`}
                                                            onClick={() => handleToggleActive(cat)}
                                                            title={cat.isActive ? "Ẩn danh mục" : "Hiện danh mục"}
                                                        >
                                                            {cat.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                            onClick={() => setDeleteConfirmId(cat._id)}
                                                            title="Xóa"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {editingId ? (
                                <><Edit className="w-4 h-4 text-primary" /> Chỉnh sửa danh mục</>
                            ) : (
                                <><Plus className="w-4 h-4 text-primary" /> Tạo danh mục mới</>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            {editingId ? "Cập nhật thông tin danh mục bài viết" : "Thêm danh mục mới để phân loại bài viết"}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-2">
                        {/* Name */}
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">Tên danh mục <span className="text-destructive">*</span></Label>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="VD: Tin chuyển nhượng, Hướng dẫn chiến thuật..."
                                className="h-10"
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">Mô tả</Label>
                            <Textarea
                                value={form.description}
                                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Mô tả ngắn gọn về danh mục..."
                                rows={2}
                                className="resize-none"
                            />
                            <p className="text-[10px] text-muted-foreground text-right">{form.description.length}/500</p>
                        </div>

                        {/* Preview */}
                        <div className="p-4 rounded-xl bg-muted/50 border">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5">Xem trước</p>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${form.gradient} flex items-center justify-center shadow-sm`}>
                                    <CategoryIcon name={form.icon} className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-foreground">{form.name || "Tên danh mục"}</div>
                                    <div className="text-xs text-muted-foreground">{form.description || "Mô tả danh mục"}</div>
                                </div>
                                <Badge style={{ backgroundColor: form.color, color: "#fff" }} className="ml-auto text-[10px] border-0 gap-1">
                                    <CategoryIcon name={form.icon} className="w-2.5 h-2.5" />
                                    {form.name || "Tag"}
                                </Badge>
                            </div>
                        </div>

                        <Separator />

                        {/* Icon Selection — Searchable Full Lucide Picker */}
                        <div className="space-y-2.5">
                            <Label className="text-xs font-semibold flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-primary" /> Biểu tượng (Icon)
                            </Label>

                            {/* Selected icon display */}
                            <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/30">
                                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${form.gradient} flex items-center justify-center shadow-sm`}>
                                    <CategoryIcon name={form.icon} className="w-4.5 h-4.5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-foreground">{form.icon}</p>
                                    <p className="text-[10px] text-muted-foreground">{iconToLabel(form.icon)}</p>
                                </div>
                                <Badge variant="outline" className="text-[10px] gap-1">
                                    <CategoryIcon name={form.icon} className="w-3 h-3" />
                                    Đã chọn
                                </Badge>
                            </div>

                            {/* Search input */}
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <Input
                                    value={iconSearch}
                                    onChange={(e) => { setIconSearch(e.target.value); setIconPage(1); }}
                                    placeholder="Tìm icon... (VD: trophy, star, heart, arrow...)"
                                    className="pl-8 h-8 text-xs"
                                />
                                {iconSearch && (
                                    <button onClick={() => { setIconSearch(""); setIconPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2">
                                        <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                                    </button>
                                )}
                            </div>

                            {/* Results count */}
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] text-muted-foreground">
                                    {iconSearch ? (
                                        <>{filteredIcons.length} kết quả cho "{iconSearch}"</>
                                    ) : (
                                        <>{allIconNames.length} icons có sẵn</>
                                    )}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                    Hiển {Math.min(visibleIcons.length, filteredIcons.length)}/{filteredIcons.length}
                                </p>
                            </div>

                            {/* Icon grid with scroll */}
                            <ScrollArea className="h-[200px] rounded-lg border p-1.5">
                                <div className="grid grid-cols-8 gap-1">
                                    {visibleIcons.map(name => {
                                        const isSelected = form.icon === name;
                                        const IconComp = (allLucideIcons as Record<string, LucideIcon>)[name];
                                        if (!IconComp) return null;
                                        return (
                                            <button
                                                key={name}
                                                type="button"
                                                onClick={() => setForm(prev => ({ ...prev, icon: name }))}
                                                className={`relative flex items-center justify-center p-2 rounded-md transition-all group/icon ${isSelected
                                                    ? "bg-primary text-primary-foreground ring-2 ring-primary/30 shadow-sm"
                                                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                                    }`}
                                                title={`${name} (${iconToLabel(name)})`}
                                            >
                                                <IconComp className="w-4 h-4" />
                                                {/* Tooltip */}
                                                <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-popover border rounded text-[8px] font-medium text-popover-foreground whitespace-nowrap opacity-0 group-hover/icon:opacity-100 pointer-events-none transition-opacity z-10 shadow-sm">
                                                    {name}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {hasMore && (
                                    <div className="flex justify-center pt-2 pb-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-[10px] gap-1"
                                            onClick={() => setIconPage(p => p + 1)}
                                        >
                                            Xem thêm ({filteredIcons.length - visibleIcons.length} còn lại)
                                        </Button>
                                    </div>
                                )}
                                {filteredIcons.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                        <Search className="w-8 h-8 mb-2 opacity-30" />
                                        <p className="text-xs">Không tìm thấy icon nào</p>
                                        <p className="text-[10px]">Thử từ khóa khác như "star", "heart", "arrow"</p>
                                    </div>
                                )}
                            </ScrollArea>
                        </div>

                        {/* Color Selection */}
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold flex items-center gap-1.5">
                                <Palette className="w-3.5 h-3.5 text-primary" /> Màu sắc
                            </Label>
                            <div className="grid grid-cols-5 gap-2">
                                {colorPresets.map(preset => {
                                    const isSelected = form.color === preset.color;
                                    return (
                                        <button
                                            key={preset.color}
                                            onClick={() => setColorPreset(preset)}
                                            className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all ${isSelected
                                                ? "border-primary ring-2 ring-primary/20"
                                                : "border-transparent hover:border-border"
                                                }`}
                                        >
                                            <div
                                                className={`w-8 h-8 rounded-lg bg-gradient-to-br ${preset.gradient} shadow-sm`}
                                            />
                                            <span className="text-[9px] font-medium text-muted-foreground">{preset.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <Separator />

                        {/* Parent Category */}
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">Danh mục cha (tùy chọn)</Label>
                            <Select
                                value={form.parent}
                                onValueChange={(val) => setForm(prev => ({ ...prev, parent: val === "none" ? "" : val }))}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Không có (danh mục gốc)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Không có (danh mục gốc)</SelectItem>
                                    {parentCategories
                                        .filter(c => c._id !== editingId)
                                        .map(c => (
                                            <SelectItem key={c._id} value={c._id}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Active Toggle */}
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-sm font-medium">Hiển thị danh mục</Label>
                                <p className="text-[11px] text-muted-foreground">Danh mục ẩn sẽ không hiển thị trên trang tin tức</p>
                            </div>
                            <Switch
                                checked={form.isActive}
                                onCheckedChange={(val) => setForm(prev => ({ ...prev, isActive: val }))}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
                            Hủy
                        </Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
                            {isSubmitting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Save className="w-3.5 h-3.5" />
                            )}
                            {editingId ? "Cập nhật" : "Tạo danh mục"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
