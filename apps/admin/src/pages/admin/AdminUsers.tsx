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
  Store,
  Pencil,
  Mail,
  Phone,
  Link2,
  ChevronRight,
  Clock,
  Loader2,
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
  admin: "bg-[var(--admin-blue-10)] text-[var(--admin-blue)]",
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

type OwnerEntry = {
  id: number;
  name: string;
  email: string;
  restaurant: string;
  status: "verified" | "pending" | "rejected";
  tier: string;
  lastActive: string;
  restaurants: number;
  phone: string;
  lineId: string;
  joinedDate: string;
};

const MOCK_OWNERS: OwnerEntry[] = [
  { id: 1, name: "Jay Fai", email: "owner@toastbkk.com", restaurant: "Jay Fai", status: "verified", tier: "Premium", lastActive: "2h ago", restaurants: 1, phone: "+66 81 xxx xxxx", lineId: "jayfai_bkk", joinedDate: "Jan 15, 2026" },
  { id: 2, name: "Somchai K.", email: "somchai@email.com", restaurant: "Som Tam Nua", status: "verified", tier: "Basic", lastActive: "1d ago", restaurants: 1, phone: "+66 82 xxx xxxx", lineId: "somchai_k", joinedDate: "Feb 1, 2026" },
  { id: 3, name: "Nattaya P.", email: "nattaya@email.com", restaurant: "Bo.Lan", status: "pending", tier: "Free", lastActive: "3d ago", restaurants: 1, phone: "+66 83 xxx xxxx", lineId: "", joinedDate: "Mar 1, 2026" },
  { id: 4, name: "Marcus W.", email: "marcus@email.com", restaurant: "Paste Bangkok", status: "verified", tier: "Premium", lastActive: "5h ago", restaurants: 2, phone: "+66 84 xxx xxxx", lineId: "marcus_w", joinedDate: "Dec 10, 2025" },
  { id: 5, name: "Arunee S.", email: "arunee@email.com", restaurant: "Sorn", status: "pending", tier: "Free", lastActive: "1w ago", restaurants: 1, phone: "+66 85 xxx xxxx", lineId: "", joinedDate: "Mar 5, 2026" },
  { id: 6, name: "Chen W.", email: "chen@email.com", restaurant: "Gaggan Anand", status: "verified", tier: "Enterprise", lastActive: "1h ago", restaurants: 3, phone: "+66 86 xxx xxxx", lineId: "chen_gaggan", joinedDate: "Nov 20, 2025" },
];

export default function AdminUsers() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"admins" | "owners">("admins");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserSafe | null>(null);
  const [formData, setFormData] = useState<UserFormData>(emptyForm);
  const [owners, setOwners] = useState(MOCK_OWNERS);
  const [ownerSearch, setOwnerSearch] = useState("");
  const [ownerStatusFilter, setOwnerStatusFilter] = useState("all");
  const [ownerDetail, setOwnerDetail] = useState<OwnerEntry | null>(null);
  const [editingOwner, setEditingOwner] = useState<OwnerEntry | null>(null);
  const [ownerEditForm, setOwnerEditForm] = useState({ name: "", email: "", tier: "", phone: "" });
  const [reviewOwner, setReviewOwner] = useState<OwnerEntry | null>(null);
  const [ownerProcessing, setOwnerProcessing] = useState(false);

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
      permissions: [...(ROLE_DEFAULT_PERMISSIONS[role] || [])],
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

  const filteredOwners = owners.filter(o => {
    const matchSearch = !ownerSearch || o.name.toLowerCase().includes(ownerSearch.toLowerCase()) || o.email.toLowerCase().includes(ownerSearch.toLowerCase());
    const matchStatus = ownerStatusFilter === "all" || o.status === ownerStatusFilter;
    return matchSearch && matchStatus;
  });

  const handleOwnerReview = (action: "approve" | "reject") => {
    if (!reviewOwner) return;
    setOwnerProcessing(true);
    setTimeout(() => {
      setOwners(prev => prev.map(o =>
        o.id === reviewOwner.id ? { ...o, status: (action === "approve" ? "verified" : "rejected") as OwnerEntry["status"] } : o
      ));
      toast({
        title: action === "approve" ? "Owner Verified" : "Claim Rejected",
        description: `${reviewOwner.name}'s claim for ${reviewOwner.restaurant} has been ${action === "approve" ? "approved" : "rejected"}`
      });
      setReviewOwner(null);
      setOwnerProcessing(false);
    }, 1000);
  };

  const openOwnerEdit = (owner: OwnerEntry) => {
    setEditingOwner(owner);
    setOwnerEditForm({ name: owner.name, email: owner.email, tier: owner.tier, phone: owner.phone });
  };

  const saveOwnerEdit = () => {
    if (!editingOwner) return;
    setOwners(prev => prev.map(o =>
      o.id === editingOwner.id ? { ...o, name: ownerEditForm.name, email: ownerEditForm.email, tier: ownerEditForm.tier, phone: ownerEditForm.phone } : o
    ));
    toast({ title: "Owner Updated", description: `${ownerEditForm.name}'s profile has been updated` });
    setEditingOwner(null);
  };

  return (
    <div data-testid="admin-users-page" className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <Users className="w-5 h-5 text-foreground" />
          <span className="text-[15px] font-semibold text-gray-800">Users</span>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 ml-2">
            <button
              onClick={() => setActiveTab("admins")}
              className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-all flex items-center gap-1.5 ${activeTab === "admins" ? "bg-white text-gray-800 shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              data-testid="tab-admins"
            >
              <Shield className="w-3.5 h-3.5" />
              Admin Users
            </button>
            <button
              onClick={() => setActiveTab("owners")}
              className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-all flex items-center gap-1.5 ${activeTab === "owners" ? "bg-white text-gray-800 shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              data-testid="tab-owners"
            >
              <Store className="w-3.5 h-3.5" />
              Restaurant Owners
            </button>
          </div>
        </div>
        {activeTab === "admins" && (
          <Button onClick={openCreate} data-testid="button-create-admin">
            <Plus className="w-4 h-4 mr-1.5" />
            Create Admin
          </Button>
        )}
      </div>

      {activeTab === "admins" && <>
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
      </>}

      {activeTab === "owners" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="section-owner-kpis">
            {[
              { label: "Total Owners", value: owners.length, color: "var(--admin-deep-purple)" },
              { label: "Verified", value: owners.filter(o => o.status === "verified").length, color: "var(--admin-cyan)" },
              { label: "Pending", value: owners.filter(o => o.status === "pending").length, color: "var(--admin-teal)" },
              { label: "Rejected", value: owners.filter(o => o.status === "rejected").length, color: "var(--admin-pink)" },
            ].map(kpi => (
              <Card key={kpi.label} className="p-4" data-testid={`card-owner-kpi-${kpi.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{kpi.label}</p>
                <p className="text-2xl font-bold tracking-tight text-gray-800">{kpi.value}</p>
              </Card>
            ))}
          </div>

          <Card className="p-0 overflow-hidden" data-testid="section-owners-table">
            <div className="flex items-center gap-3 p-4 border-b border-gray-100 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search owners..."
                  value={ownerSearch}
                  onChange={(e) => setOwnerSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-owners"
                />
              </div>
              <select
                value={ownerStatusFilter}
                onChange={(e) => setOwnerStatusFilter(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-3 py-2 text-gray-600 focus:outline-none"
                data-testid="select-owner-status"
              >
                <option value="all">All Status</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Owner</th>
                    <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Restaurant</th>
                    <th className="text-center py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</th>
                    <th className="text-center py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Tier</th>
                    <th className="text-center py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Last Active</th>
                    <th className="text-center py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOwners.map((owner) => (
                    <tr key={owner.id} className="border-b border-gray-100" data-testid={`row-owner-${owner.id}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold ${
                            owner.status === "verified" ? "bg-[#00B14F]/10 text-[#00B14F]" :
                            owner.status === "pending" ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-600"
                          }`}>
                            {owner.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-medium text-foreground">{owner.name}</span>
                            <p className="text-[10px] text-muted-foreground">{owner.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-700">{owner.restaurant}</span>
                        {owner.restaurants > 1 && <span className="text-[10px] text-gray-400 ml-1">+{owner.restaurants - 1}</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant="secondary"
                          className={
                            owner.status === "verified" ? "bg-[#00B14F]/10 text-[#00B14F]" :
                            owner.status === "pending" ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-600"
                          }
                          data-testid={`badge-owner-status-${owner.id}`}
                        >
                          {owner.status === "verified" && <ShieldCheck className="w-3 h-3 mr-1" />}
                          {owner.status === "pending" && <Clock className="w-3 h-3 mr-1" />}
                          {owner.status === "rejected" && <X className="w-3 h-3 mr-1" />}
                          <span className="capitalize">{owner.status}</span>
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="outline" className="text-[10px]" data-testid={`badge-owner-tier-${owner.id}`}>
                          {owner.tier}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center text-xs text-muted-foreground">{owner.lastActive}</td>
                      <td className="py-3 px-4 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" data-testid={`button-owner-actions-${owner.id}`}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setOwnerDetail(owner)} data-testid={`button-owner-view-${owner.id}`}>
                              <Eye className="w-3.5 h-3.5 mr-2" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openOwnerEdit(owner)} data-testid={`button-owner-edit-${owner.id}`}>
                              <Pencil className="w-3.5 h-3.5 mr-2" /> Edit Profile
                            </DropdownMenuItem>
                            {owner.status === "pending" && (
                              <DropdownMenuItem onClick={() => setReviewOwner(owner)} data-testid={`button-owner-review-${owner.id}`}>
                                <ShieldCheck className="w-3.5 h-3.5 mr-2" /> Review Claim
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {ownerDetail && !editingOwner && !reviewOwner && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6" data-testid="owner-detail-modal">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                      ownerDetail.status === "verified" ? "bg-[#00B14F]/10 text-[#00B14F]" : "bg-amber-100 text-amber-700"
                    }`}>{ownerDetail.name.charAt(0)}</div>
                    <h3 className="text-sm font-semibold text-gray-800">{ownerDetail.name}</h3>
                  </div>
                  <button onClick={() => setOwnerDetail(null)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200" data-testid="btn-close-owner-detail">
                    <X className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                </div>
                <div className="px-6 py-5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-gray-50"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Email</p><p className="text-xs text-gray-700">{ownerDetail.email}</p></div>
                    <div className="p-3 rounded-xl bg-gray-50"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Phone</p><p className="text-xs text-gray-700">{ownerDetail.phone}</p></div>
                    <div className="p-3 rounded-xl bg-gray-50"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status</p><span className={`text-xs font-medium ${ownerDetail.status === "verified" ? "text-emerald-600" : ownerDetail.status === "pending" ? "text-amber-600" : "text-red-500"}`}>{ownerDetail.status}</span></div>
                    <div className="p-3 rounded-xl bg-gray-50"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tier</p><p className="text-xs text-gray-700">{ownerDetail.tier}</p></div>
                    <div className="p-3 rounded-xl bg-gray-50"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Restaurant</p><p className="text-xs text-gray-700">{ownerDetail.restaurant}</p></div>
                    <div className="p-3 rounded-xl bg-gray-50"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">LINE ID</p><p className="text-xs text-gray-700">{ownerDetail.lineId || "Not linked"}</p></div>
                    <div className="p-3 rounded-xl bg-gray-50"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Joined</p><p className="text-xs text-gray-700">{ownerDetail.joinedDate}</p></div>
                    <div className="p-3 rounded-xl bg-gray-50"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Last Active</p><p className="text-xs text-gray-700">{ownerDetail.lastActive}</p></div>
                  </div>
                </div>
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
                  <button onClick={() => { openOwnerEdit(ownerDetail); setOwnerDetail(null); }} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 rounded-lg bg-white border border-gray-200" data-testid="btn-edit-from-detail">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => setOwnerDetail(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800 rounded-lg">Close</button>
                </div>
              </div>
            </div>
          )}

          {editingOwner && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6" data-testid="edit-owner-dialog">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-800">Edit Owner Profile</h3>
                  <button onClick={() => setEditingOwner(null)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200" data-testid="btn-close-edit-owner">
                    <X className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <div><label className="text-xs font-medium text-gray-500 block mb-1">Name</label>
                    <input type="text" value={ownerEditForm.name} onChange={e => setOwnerEditForm({ ...ownerEditForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-100" data-testid="input-edit-owner-name" /></div>
                  <div><label className="text-xs font-medium text-gray-500 block mb-1">Email</label>
                    <input type="email" value={ownerEditForm.email} onChange={e => setOwnerEditForm({ ...ownerEditForm, email: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-100" data-testid="input-edit-owner-email" /></div>
                  <div><label className="text-xs font-medium text-gray-500 block mb-1">Phone</label>
                    <input type="text" value={ownerEditForm.phone} onChange={e => setOwnerEditForm({ ...ownerEditForm, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-100" data-testid="input-edit-owner-phone" /></div>
                  <div><label className="text-xs font-medium text-gray-500 block mb-1">Tier</label>
                    <select value={ownerEditForm.tier} onChange={e => setOwnerEditForm({ ...ownerEditForm, tier: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" data-testid="select-edit-owner-tier">
                      <option value="Free">Free</option>
                      <option value="Basic">Basic</option>
                      <option value="Premium">Premium</option>
                      <option value="Enterprise">Enterprise</option>
                    </select></div>
                </div>
                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
                  <button onClick={() => setEditingOwner(null)} className="px-4 py-2 text-sm text-gray-500 rounded-lg" data-testid="btn-cancel-edit-owner">Cancel</button>
                  <button onClick={saveOwnerEdit} className="px-4 py-2 text-sm font-semibold bg-[var(--admin-deep-purple)] text-white rounded-lg hover:opacity-90" data-testid="btn-save-edit-owner">Save Changes</button>
                </div>
              </div>
            </div>
          )}

          {reviewOwner && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6" data-testid="review-owner-dialog">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-800">Review Ownership Claim</h3>
                  </div>
                  <button onClick={() => setReviewOwner(null)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200" data-testid="btn-close-review-owner">
                    <X className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700">{reviewOwner.name.charAt(0)}</div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{reviewOwner.name}</p>
                      <p className="text-xs text-gray-400">{reviewOwner.email}</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Claiming Restaurant</p>
                    <p className="text-sm font-medium text-gray-800">{reviewOwner.restaurant}</p>
                    <p className="text-xs text-gray-400 mt-1">Submitted: {reviewOwner.joinedDate}</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
                  <button onClick={() => setReviewOwner(null)} className="px-4 py-2 text-sm text-gray-500 rounded-lg" data-testid="btn-cancel-review-owner">Cancel</button>
                  <button
                    onClick={() => handleOwnerReview("reject")}
                    disabled={ownerProcessing}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50"
                    data-testid="btn-reject-owner-claim"
                  >
                    {ownerProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                    Reject
                  </button>
                  <button
                    onClick={() => handleOwnerReview("approve")}
                    disabled={ownerProcessing}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
                    data-testid="btn-approve-owner-claim"
                  >
                    {ownerProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Approve
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
