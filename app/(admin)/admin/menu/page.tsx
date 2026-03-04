"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Plus, Trash2, GripVertical, Save, Loader2, Eye, EyeOff,
    ExternalLink, ChevronDown, ChevronRight, ArrowLeft,
    Globe, Menu as MenuIcon, LayoutDashboard, PanelBottom
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminAPI } from "@/lib/api";
import { toast } from "sonner";

interface MenuItem {
    _id?: string;
    label: string;
    href: string;
    icon: string;
    order: number;
    isVisible: boolean;
    openInNewTab: boolean;
    children?: MenuItem[];
}

const defaultItem: MenuItem = {
    label: "",
    href: "",
    icon: "",
    order: 0,
    isVisible: true,
    openInNewTab: false,
    children: [],
};

const locationInfo: Record<string, { label: string; icon: typeof Globe; desc: string }> = {
    navbar: { label: "Menu chính (Navbar)", icon: MenuIcon, desc: "Menu hiển thị trên thanh điều hướng chính" },
    footer: { label: "Menu Footer", icon: PanelBottom, desc: "Menu hiển thị ở phần chân trang" },
    sidebar: { label: "Menu Sidebar", icon: LayoutDashboard, desc: "Menu sidebar bổ sung" },
};

export default function MenuManagementPage() {
    const [menus, setMenus] = useState<Record<string, MenuItem[]>>({
        navbar: [],
        footer: [],
        sidebar: [],
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("navbar");
    const [expandedItem, setExpandedItem] = useState<string | null>(null);

    useEffect(() => { loadMenus(); }, []);

    const loadMenus = async () => {
        setIsLoading(true);
        try {
            const res = await adminAPI.getMenus();
            if (res.success && res.data.menus) {
                const menuMap: Record<string, MenuItem[]> = { navbar: [], footer: [], sidebar: [] };
                res.data.menus.forEach((m: any) => {
                    if (m.location && menuMap[m.location] !== undefined) {
                        menuMap[m.location] = m.items || [];
                    }
                });
                setMenus(menuMap);
            }
        } catch (e: any) {
            toast.error("Không thể tải menu");
        } finally {
            setIsLoading(false);
        }
    };

    const saveMenu = async (location: string) => {
        setIsSaving(true);
        try {
            const items = menus[location].map((item, i) => ({
                ...item,
                order: i,
                children: (item.children || []).map((child, j) => ({ ...child, order: j })),
            }));
            const res = await adminAPI.updateMenu(location, items);
            if (res.success) toast.success("Đã lưu menu thành công!");
            else toast.error(res.message || "Lỗi lưu menu");
        } catch (e: any) {
            toast.error(e.message || "Có lỗi xảy ra");
        } finally {
            setIsSaving(false);
        }
    };

    const addItem = (location: string) => {
        setMenus(prev => ({
            ...prev,
            [location]: [...prev[location], { ...defaultItem, order: prev[location].length }],
        }));
    };

    const removeItem = (location: string, index: number) => {
        setMenus(prev => ({
            ...prev,
            [location]: prev[location].filter((_, i) => i !== index),
        }));
    };

    const updateItem = (location: string, index: number, key: keyof MenuItem, value: any) => {
        setMenus(prev => ({
            ...prev,
            [location]: prev[location].map((item, i) => i === index ? { ...item, [key]: value } : item),
        }));
    };

    const addSubItem = (location: string, parentIndex: number) => {
        setMenus(prev => ({
            ...prev,
            [location]: prev[location].map((item, i) =>
                i === parentIndex
                    ? { ...item, children: [...(item.children || []), { ...defaultItem, order: (item.children || []).length }] }
                    : item
            ),
        }));
    };

    const removeSubItem = (location: string, parentIndex: number, childIndex: number) => {
        setMenus(prev => ({
            ...prev,
            [location]: prev[location].map((item, i) =>
                i === parentIndex
                    ? { ...item, children: (item.children || []).filter((_, j) => j !== childIndex) }
                    : item
            ),
        }));
    };

    const updateSubItem = (location: string, parentIndex: number, childIndex: number, key: keyof MenuItem, value: any) => {
        setMenus(prev => ({
            ...prev,
            [location]: prev[location].map((item, i) =>
                i === parentIndex
                    ? { ...item, children: (item.children || []).map((child, j) => j === childIndex ? { ...child, [key]: value } : child) }
                    : item
            ),
        }));
    };

    const moveItem = (location: string, index: number, direction: "up" | "down") => {
        const items = [...menus[location]];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= items.length) return;
        [items[index], items[targetIndex]] = [items[targetIndex], items[index]];
        setMenus(prev => ({ ...prev, [location]: items }));
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Đang tải menu...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Globe className="w-5 h-5 text-primary" /> Quản lý Menu
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Tùy biến menu điều hướng trên website</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full">
                    {Object.entries(locationInfo).map(([key, val]) => (
                        <TabsTrigger key={key} value={key} className="flex-1 gap-2">
                            <val.icon className="w-4 h-4" /> {val.label.split(" (")[0]}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {Object.entries(locationInfo).map(([location, info]) => (
                    <TabsContent key={location} value={location} className="space-y-4 mt-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <info.icon className="w-4 h-4 text-primary" /> {info.label}
                                        </CardTitle>
                                        <CardDescription className="mt-0.5">{info.desc}</CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => addItem(location)} className="gap-1.5">
                                            <Plus className="w-3.5 h-3.5" /> Thêm mục
                                        </Button>
                                        <Button size="sm" onClick={() => saveMenu(location)} disabled={isSaving} className="gap-1.5">
                                            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                            Lưu
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {menus[location].length === 0 ? (
                                    <div className="text-center py-12">
                                        <MenuIcon className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                                        <p className="text-sm text-muted-foreground">Chưa có mục menu nào</p>
                                        <Button variant="outline" size="sm" onClick={() => addItem(location)} className="mt-3 gap-1.5">
                                            <Plus className="w-3.5 h-3.5" /> Thêm mục đầu tiên
                                        </Button>
                                    </div>
                                ) : (
                                    menus[location].map((item, index) => (
                                        <div key={index} className="border rounded-lg overflow-hidden">
                                            {/* Menu item header */}
                                            <div className="flex items-center gap-2 p-3 bg-muted/30">
                                                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab flex-shrink-0" />

                                                <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-2">
                                                    <Input
                                                        value={item.label}
                                                        onChange={(e) => updateItem(location, index, "label", e.target.value)}
                                                        placeholder="Tên hiển thị"
                                                        className="h-8 text-sm"
                                                    />
                                                    <Input
                                                        value={item.href}
                                                        onChange={(e) => updateItem(location, index, "href", e.target.value)}
                                                        placeholder="/duong-dan"
                                                        className="h-8 text-sm"
                                                    />
                                                    <Input
                                                        value={item.icon}
                                                        onChange={(e) => updateItem(location, index, "icon", e.target.value)}
                                                        placeholder="Icon (tùy chọn)"
                                                        className="h-8 text-sm"
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center gap-1.5" title="Hiển thị">
                                                            <Switch
                                                                checked={item.isVisible}
                                                                onCheckedChange={(val) => updateItem(location, index, "isVisible", val)}
                                                            />
                                                            {item.isVisible ? <Eye className="w-3.5 h-3.5 text-emerald-500" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
                                                        </div>
                                                        <div className="flex items-center gap-1.5" title="Tab mới">
                                                            <Switch
                                                                checked={item.openInNewTab}
                                                                onCheckedChange={(val) => updateItem(location, index, "openInNewTab", val)}
                                                            />
                                                            <ExternalLink className="w-3 h-3 text-muted-foreground" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => moveItem(location, index, "up")} disabled={index === 0}>
                                                        <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => moveItem(location, index, "down")} disabled={index === menus[location].length - 1}>
                                                        <ChevronDown className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpandedItem(expandedItem === `${location}-${index}` ? null : `${location}-${index}`)}>
                                                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expandedItem === `${location}-${index}` ? "rotate-90" : ""}`} />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => removeItem(location, index)}>
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Subitems */}
                                            {expandedItem === `${location}-${index}` && (
                                                <div className="p-3 bg-muted/10 border-t space-y-2">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <Label className="text-xs text-muted-foreground">Menu con ({(item.children || []).length})</Label>
                                                        <Button variant="outline" size="sm" onClick={() => addSubItem(location, index)} className="h-6 text-[10px] gap-1 px-2">
                                                            <Plus className="w-3 h-3" /> Thêm con
                                                        </Button>
                                                    </div>
                                                    {(item.children || []).map((child, ci) => (
                                                        <div key={ci} className="flex items-center gap-2 pl-6">
                                                            <span className="text-muted-foreground/40 text-xs">└</span>
                                                            <Input
                                                                value={child.label}
                                                                onChange={(e) => updateSubItem(location, index, ci, "label", e.target.value)}
                                                                placeholder="Tên"
                                                                className="h-7 text-xs flex-1"
                                                            />
                                                            <Input
                                                                value={child.href}
                                                                onChange={(e) => updateSubItem(location, index, ci, "href", e.target.value)}
                                                                placeholder="/duong-dan"
                                                                className="h-7 text-xs flex-1"
                                                            />
                                                            <Switch
                                                                checked={child.isVisible}
                                                                onCheckedChange={(val) => updateSubItem(location, index, ci, "isVisible", val)}
                                                            />
                                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => removeSubItem(location, index, ci)}>
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                    {(item.children || []).length === 0 && (
                                                        <p className="text-[11px] text-muted-foreground text-center py-2">Chưa có menu con</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}

                                {menus[location].length > 0 && (
                                    <>
                                        <Separator />
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-muted-foreground">
                                                {menus[location].length} mục menu · {menus[location].filter(i => i.isVisible).length} đang hiện
                                            </p>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" onClick={() => addItem(location)} className="gap-1.5 text-xs">
                                                    <Plus className="w-3 h-3" /> Thêm mục
                                                </Button>
                                                <Button size="sm" onClick={() => saveMenu(location)} disabled={isSaving} className="gap-1.5 text-xs">
                                                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                                    Lưu thay đổi
                                                </Button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {/* Preview */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Eye className="w-4 h-4 text-primary" /> Xem trước
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="p-4 rounded-lg bg-muted/50 border">
                                    {location === "navbar" ? (
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs font-bold text-primary">eFootCup</span>
                                            <div className="flex items-center gap-3">
                                                {menus[location].filter(i => i.isVisible).map((item, i) => (
                                                    <div key={i} className="relative group">
                                                        <span className="text-xs font-medium text-foreground hover:text-primary cursor-pointer flex items-center gap-1">
                                                            {item.label}
                                                            {(item.children || []).filter(c => c.isVisible).length > 0 && <ChevronDown className="w-2.5 h-2.5" />}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                                            {menus[location].filter(i => i.isVisible).map((item, i) => (
                                                <div key={i}>
                                                    <span className="text-xs font-medium text-foreground">{item.label}</span>
                                                    {(item.children || []).filter(c => c.isVisible).length > 0 && (
                                                        <div className="ml-2 mt-1 space-y-0.5">
                                                            {(item.children || []).filter(c => c.isVisible).map((child, ci) => (
                                                                <p key={ci} className="text-[10px] text-muted-foreground">{child.label}</p>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {menus[location].filter(i => i.isVisible).length === 0 && (
                                        <p className="text-xs text-muted-foreground text-center">Chưa có mục nào hiển thị</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
