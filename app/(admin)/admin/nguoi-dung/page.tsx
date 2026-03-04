"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users, Search, Filter, Crown, Shield, UserCheck, UserX,
    MoreVertical, Mail, Phone, Calendar, Loader2, ChevronDown,
    CheckCircle2, XCircle, Trash2, Edit, ArrowUpRight, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminAPI } from "@/lib/api";
import { format } from "date-fns";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const roleStyles: Record<string, { label: string; color: string; icon: typeof Crown }> = {
    admin: { label: "Admin", color: "bg-amber-50 text-amber-700 border-amber-200", icon: Crown },
    manager: { label: "Manager", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Shield },
    user: { label: "User", color: "bg-gray-100 text-gray-600 border-gray-200", icon: Users },
};

export default function AdminUsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [pagination, setPagination] = useState<any>({ page: 1, total: 0, totalPages: 1 });
    const [editUser, setEditUser] = useState<any>(null);
    const [editForm, setEditForm] = useState({ role: "", isActive: true, isVerified: true });
    const { confirm } = useConfirmDialog();

    useEffect(() => {
        loadUsers();
    }, [roleFilter, pagination.page]);

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const params: Record<string, string> = {
                page: String(pagination.page),
                limit: "20",
            };
            if (search) params.search = search;
            if (roleFilter) params.role = roleFilter;

            const res = await adminAPI.getUsers(params);
            if (res.success) {
                setUsers(res.data.users);
                setPagination(res.data.pagination);
            }
        } catch (error) {
            console.error("Load users error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = () => {
        setPagination((prev: any) => ({ ...prev, page: 1 }));
        loadUsers();
    };

    const handleUpdateRole = async (userId: string, newRole: string) => {
        try {
            const res = await adminAPI.updateUser(userId, { role: newRole });
            if (res.success) {
                toast.success(`Đã cập nhật role thành ${newRole}`);
                loadUsers();
            } else {
                toast.error(res.message);
            }
        } catch (e: any) {
            toast.error(e.message || "Có lỗi xảy ra");
        }
    };

    const handleToggleActive = async (userId: string, isActive: boolean) => {
        try {
            const res = await adminAPI.updateUser(userId, { isActive: !isActive });
            if (res.success) {
                toast.success(isActive ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản");
                loadUsers();
            }
        } catch (e: any) {
            toast.error(e.message || "Có lỗi xảy ra");
        }
    };

    const handleDelete = async (userId: string, name: string) => {
        const ok = await confirm({
            title: "Xóa người dùng?",
            description: `Bạn có chắc muốn xóa người dùng "${name}"? Hành động này không thể hoàn tác!`,
            variant: "danger",
            confirmText: "Xóa người dùng",
        });
        if (!ok) return;
        try {
            const res = await adminAPI.deleteUser(userId);
            if (res.success) {
                toast.success("Đã xóa người dùng");
                loadUsers();
            } else {
                toast.error(res.message);
            }
        } catch (e: any) {
            toast.error(e.message || "Có lỗi xảy ra");
        }
    };

    const openEditModal = (u: any) => {
        setEditUser(u);
        setEditForm({
            role: u.role,
            isActive: u.isActive,
            isVerified: u.isVerified,
        });
    };

    const handleEditSubmit = async () => {
        if (!editUser) return;
        try {
            const res = await adminAPI.updateUser(editUser._id, editForm);
            if (res.success) {
                toast.success("Cập nhật thành công");
                setEditUser(null);
                loadUsers();
            } else {
                toast.error(res.message);
            }
        } catch (e: any) {
            toast.error(e.message || "Có lỗi xảy ra");
        }
    };

    const roles = ["", "admin", "manager", "user"];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-efb-dark tracking-tight">Quản lý người dùng</h1>
                    <p className="text-sm text-efb-text-muted mt-1">
                        Tổng cộng {pagination.total} người dùng
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-efb-text-muted" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        placeholder="Tìm theo tên, email, Gamer ID..."
                        className="pl-10 h-10 rounded-xl"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {roles.map((r) => {
                        const sty = r ? roleStyles[r] : null;
                        return (
                            <button
                                key={r}
                                onClick={() => {
                                    setRoleFilter(r);
                                    setPagination((prev: any) => ({ ...prev, page: 1 }));
                                }}
                                className={`whitespace-nowrap px-3.5 py-2 rounded-xl text-sm font-medium transition-all border ${roleFilter === r
                                    ? "bg-efb-blue text-white border-efb-blue shadow-sm"
                                    : "bg-white text-efb-text-secondary border-gray-200 hover:border-gray-300"
                                    }`}
                            >
                                {r === "" ? "Tất cả" : sty?.label || r}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-efb-blue" />
                </div>
            ) : users.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-efb-dark mb-2">Không tìm thấy người dùng</h3>
                    <p className="text-sm text-efb-text-muted">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-[#f8f9fc] text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                    <th className="px-6 py-4 text-left font-bold">Người dùng</th>
                                    <th className="px-6 py-4 text-left font-bold">Liên hệ</th>
                                    <th className="px-6 py-4 text-center font-bold">Role</th>
                                    <th className="px-6 py-4 text-center font-bold">Trạng thái</th>
                                    <th className="px-6 py-4 text-center font-bold">Ngày tạo</th>
                                    <th className="px-6 py-4 text-right font-bold">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {users.map((u, i) => {
                                    const roleSty = roleStyles[u.role] || roleStyles.user;
                                    const RoleIcon = roleSty.icon;
                                    return (
                                        <motion.tr
                                            key={u._id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.02 }}
                                            className="hover:bg-gray-50/50 transition-colors group"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${u.role === "admin" ? "bg-amber-50 text-amber-700" : u.role === "manager" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                                                        {u.name?.charAt(0) || "?"}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-semibold text-efb-dark">{u.name}</div>
                                                        {u.gamerId && (
                                                            <div className="text-[10px] text-efb-text-muted font-mono mt-0.5">{u.gamerId}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5 text-xs text-efb-text-secondary">
                                                        <Mail className="w-3 h-3" /> {u.email}
                                                    </div>
                                                    {u.phone && (
                                                        <div className="flex items-center gap-1.5 text-xs text-efb-text-secondary">
                                                            <Phone className="w-3 h-3" /> {u.phone}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity ${roleSty.color}`}>
                                                            <RoleIcon className="w-3 h-3" />
                                                            {roleSty.label}
                                                            <ChevronDown className="w-2.5 h-2.5 opacity-50" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent className="rounded-xl">
                                                        {["admin", "manager", "user"].map((r) => (
                                                            <DropdownMenuItem
                                                                key={r}
                                                                onClick={() => handleUpdateRole(u._id, r)}
                                                                className={`text-sm cursor-pointer ${u.role === r ? "text-efb-blue font-bold" : ""}`}
                                                            >
                                                                {roleStyles[r].label}
                                                                {u.role === r && <CheckCircle2 className="w-3.5 h-3.5 ml-auto" />}
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${u.isActive ? "bg-emerald-400" : "bg-red-400"}`} />
                                                    <span className={`text-[11px] font-medium ${u.isActive ? "text-emerald-600" : "text-red-500"}`}>
                                                        {u.isActive ? "Hoạt động" : "Đã khóa"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="text-xs text-efb-text-muted">
                                                    {u.createdAt ? format(new Date(u.createdAt), "dd/MM/yyyy") : "N/A"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                                            <MoreVertical className="w-4 h-4 text-gray-400" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-xl w-48">
                                                        <DropdownMenuItem onClick={() => openEditModal(u)} className="cursor-pointer">
                                                            <Edit className="w-3.5 h-3.5 mr-2" /> Chỉnh sửa
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleToggleActive(u._id, u.isActive)} className="cursor-pointer">
                                                            {u.isActive ? (
                                                                <><UserX className="w-3.5 h-3.5 mr-2" /> Khóa tài khoản</>
                                                            ) : (
                                                                <><UserCheck className="w-3.5 h-3.5 mr-2" /> Mở khóa</>
                                                            )}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleDelete(u._id, u.name)} className="text-red-600 cursor-pointer">
                                                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Xóa người dùng
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-xs text-efb-text-muted">
                                Trang {pagination.page} / {pagination.totalPages} ({pagination.total} người dùng)
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.page <= 1}
                                    onClick={() => setPagination((prev: any) => ({ ...prev, page: prev.page - 1 }))}
                                    className="rounded-lg"
                                >
                                    Trước
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.page >= pagination.totalPages}
                                    onClick={() => setPagination((prev: any) => ({ ...prev, page: prev.page + 1 }))}
                                    className="rounded-lg"
                                >
                                    Sau
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Edit User Modal */}
            <Dialog open={!!editUser} onOpenChange={(v) => !v && setEditUser(null)}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle>Chỉnh sửa người dùng</DialogTitle>
                    </DialogHeader>
                    {editUser && (
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-efb-blue font-bold">
                                    {editUser.name?.charAt(0)}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-efb-dark">{editUser.name}</div>
                                    <div className="text-xs text-efb-text-muted">{editUser.email}</div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm">Vai trò</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(["user", "manager", "admin"] as const).map((r) => (
                                        <button
                                            key={r}
                                            onClick={() => setEditForm({ ...editForm, role: r })}
                                            className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${editForm.role === r
                                                ? "bg-efb-blue text-white border-efb-blue shadow-sm"
                                                : "bg-white text-efb-text-secondary border-gray-200 hover:border-gray-300"
                                                }`}
                                        >
                                            {roleStyles[r].label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                                <span className="text-sm text-efb-text-secondary">Tài khoản hoạt động</span>
                                <button
                                    onClick={() => setEditForm({ ...editForm, isActive: !editForm.isActive })}
                                    className={`w-11 h-6 rounded-full transition-colors relative ${editForm.isActive ? "bg-emerald-500" : "bg-gray-200"}`}
                                >
                                    <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all shadow-sm ${editForm.isActive ? "left-6" : "left-1"}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                                <span className="text-sm text-efb-text-secondary">Đã xác minh email</span>
                                <button
                                    onClick={() => setEditForm({ ...editForm, isVerified: !editForm.isVerified })}
                                    className={`w-11 h-6 rounded-full transition-colors relative ${editForm.isVerified ? "bg-efb-blue" : "bg-gray-200"}`}
                                >
                                    <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all shadow-sm ${editForm.isVerified ? "left-6" : "left-1"}`} />
                                </button>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setEditUser(null)}
                                    className="flex-1 rounded-xl"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    onClick={handleEditSubmit}
                                    className="flex-1 bg-efb-blue text-white hover:bg-efb-blue/90 rounded-xl"
                                >
                                    Lưu thay đổi
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
