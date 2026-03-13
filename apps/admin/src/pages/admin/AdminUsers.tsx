import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Users,
  Plus,
  Shield,
  ShieldCheck,
  Eye,
  MoreHorizontal,
  Check,
  X,
  UserCog,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AdminUser } from "@shared/schema";
import { ADMIN_ROLES, ADMIN_PERMISSIONS, ROLE_DEFAULT_PERMISSIONS } from "@shared/schema";

type AdminUserSafe = Omit<AdminUser, "passwordHash">;

const ROLE_COLORS: Record<string, string> = {
  superadmin: "bg-[#FFCC02]/15 text-[#FFCC02]",
  admin: "bg-[#6C2BD9]/10 text-[#6C2BD9]",
  moderator: "bg-[#00B14F]/10 text-[#00B14F]",
  viewer: "bg-gray-100 text-gray-500",
};

const ROLE_ICONS: Record<string, typeof Shield> = {
  superadmin: ShieldCheck,
  admin: Shield,
  moderator: UserCog,
  viewer: Eye,
};

const PERMISSION_LABELS: Record<string, string> = {
  manage_restaurants: "Manage Restaurants",
  manage_users: "Manage Users",
  manage_campaigns: "Manage Campaigns",
  manage_banners: "Manage Banners",
  view_analytics: "View Analytics",
  manage_claims: "Manage Claims",
  manage_config: "Manage Config",
};

interface UserFormData {
  username: string;
  password: string;
  role: string;
  permissions: string[];
}

const emptyForm: UserFormData = {
  username: "",
  password: "",
  role: "viewer",
  permissions: [...(ROLE_DEFAULT_PERMISSIONS["viewer"] || [])],
};

export default function AdminUsers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserSafe | null>(null);
  const [formData, setFormData] = useState<UserFormData>(emptyForm);

  const { data: adminUsers = [], isLoading } = useQuery<AdminUserSafe[]>({
    queryKey: ["/api/admin/admin-users"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const res = await apiRequest("POST", "/api/admin/admin-users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/admin-users"] });
      setDialogOpen(false);
      toast({ title: "Admin user created" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<UserFormData & { isActive: boolean }> }) => {
      const res = await apiRequest("PATCH", `/api/admin/admin-users/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/admin-users"] });
      setDialogOpen(false);
      toast({ title: "Admin user updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const openCreate = () => {
    setEditingUser(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (user: AdminUserSafe) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: "",
      role: user.role || "admin",
      permissions: user.permissions || [],
    });
    setDialogOpen(true);
  };

  const handleRoleChange = (role: string) => {
    setFormData({
      ...formData,
      role,
      permissions: [...((ROLE_DEFAULT_PERMISSIONS as Record<string, string[]>)[role] || [])],
    });
  };

  const togglePermission = (perm: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  const handleSubmit = () => {
    if (editingUser) {
      const payload: any = {
        role: formData.role,
        permissions: formData.permissions,
      };
      if (formData.password) payload.password = formData.password;
      updateMutation.mutate({ id: editingUser.id, data: payload });
    } else {
      if (!formData.username || !formData.password) {
        toast({ title: "Username and password are required", variant: "destructive" });
        return;
      }
      createMutation.mutate(formData);
    }
  };

  const toggleActive = (user: AdminUserSafe) => {
    updateMutation.mutate({ id: user.id, data: { isActive: !user.isActive } });
  };

  const filtered = adminUsers.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.role || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = adminUsers.filter((u) => u.isActive).length;

  return (
    <div data-testid="admin-users-page" className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <Users className="w-5 h-5 text-foreground" />
          <span className="text-[15px] font-semibold text-gray-800">Admin Users</span>
          <Badge variant="secondary" data-testid="text-admin-count">
            {adminUsers.length} total
          </Badge>
          <Badge variant="outline" data-testid="text-active-count">
            {activeCount} active
          </Badge>
        </div>
        <Button onClick={openCreate} data-testid="button-create-admin">
          <Plus className="w-4 h-4 mr-1.5" />
          Create Admin
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="section-role-summary">
        {ADMIN_ROLES.map((role) => {
          const count = adminUsers.filter((u) => u.role === role).length;
          const RoleIcon = ROLE_ICONS[role] || Shield;
          return (
            <Card key={role} className="p-4" data-testid={`card-role-${role}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-md flex items-center justify-center ${ROLE_COLORS[role]}`}>
                  <RoleIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider capitalize">{role}</span>
              </div>
              <div className="text-2xl font-bold tracking-tight text-gray-800">{count}</div>
            </Card>
          );
        })}
      </div>

      <Card className="p-0 overflow-hidden" data-testid="section-admin-users-table">
        <div className="flex items-center gap-3 p-4 border-b border-gray-100 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search admin users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-admins"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Username</th>
                <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Role</th>
                <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Permissions</th>
                <th className="text-center py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</th>
                <th className="text-center py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Created</th>
                <th className="text-center py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td colSpan={6} className="py-4 px-4">
                      <div className="h-5 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    No admin users found
                  </td>
                </tr>
              ) : (
                filtered.map((user) => {
                  const RoleIcon = ROLE_ICONS[user.role || "admin"] || Shield;
                  return (
                    <tr
                      key={user.id}
                      className="border-b border-gray-100"
                      data-testid={`row-admin-${user.id}`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold ${ROLE_COLORS[user.role || "admin"]}`}>
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-foreground" data-testid={`text-username-${user.id}`}>
                            {user.username}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="secondary"
                          className={`${ROLE_COLORS[user.role || "admin"]} gap-1`}
                          data-testid={`badge-role-${user.id}`}
                        >
                          <RoleIcon className="w-3 h-3" />
                          <span className="capitalize">{user.role || "admin"}</span>
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(user.permissions || []).slice(0, 3).map((perm) => (
                            <Badge key={perm} variant="outline" className="text-[10px]" data-testid={`badge-perm-${user.id}-${perm}`}>
                              {PERMISSION_LABELS[perm] || perm}
                            </Badge>
                          ))}
                          {(user.permissions || []).length > 3 && (
                            <Badge variant="outline" className="text-[10px]">
                              +{(user.permissions || []).length - 3}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={user.isActive ? "default" : "secondary"}
                          className={user.isActive ? "bg-[#00B14F]/10 text-[#00B14F]" : ""}
                          data-testid={`badge-status-${user.id}`}
                        >
                          {user.isActive ? (
                            <><Check className="w-3 h-3 mr-1" />Active</>
                          ) : (
                            <><X className="w-3 h-3 mr-1" />Disabled</>
                          )}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center text-xs text-muted-foreground" data-testid={`text-created-${user.id}`}>
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" data-testid={`button-actions-${user.id}`}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(user)} data-testid={`button-edit-${user.id}`}>
                              Edit Role & Permissions
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleActive(user)} data-testid={`button-toggle-${user.id}`}>
                              {user.isActive ? "Disable Account" : "Enable Account"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-admin-user">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingUser ? "Edit Admin User" : "Create Admin User"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                disabled={!!editingUser}
                placeholder="Enter username"
                data-testid="input-username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                {editingUser ? "New Password (leave blank to keep)" : "Password"}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingUser ? "Leave blank to keep current" : "Enter password"}
                data-testid="input-password"
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={handleRoleChange}>
                <SelectTrigger data-testid="select-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_ROLES.map((role) => (
                    <SelectItem key={role} value={role} data-testid={`option-role-${role}`}>
                      <span className="capitalize">{role === "superadmin" ? "Super Admin" : role}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Permissions</Label>
              <div className="grid grid-cols-1 gap-3">
                {ADMIN_PERMISSIONS.map((perm) => (
                  <div
                    key={perm}
                    className="flex items-center justify-between gap-2"
                    data-testid={`toggle-perm-${perm}`}
                  >
                    <span className="text-sm text-foreground">
                      {PERMISSION_LABELS[perm] || perm}
                    </span>
                    <Switch
                      checked={formData.permissions.includes(perm)}
                      onCheckedChange={() => togglePermission(perm)}
                      data-testid={`switch-perm-${perm}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit"
              >
                {(createMutation.isPending || updateMutation.isPending)
                  ? "Saving..."
                  : editingUser
                    ? "Update"
                    : "Create"
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
