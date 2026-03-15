import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
  Clock,
  Loader2,
  ChevronRight,
  UserCircle,
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

type ClaimEntry = {
  id: number;
  ownerId: number;
  restaurantId: number;
  status: "pending" | "approved" | "rejected";
  ownershipType: string;
  submittedAt: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  restaurantName: string;
  restaurantAddress: string;
  restaurantCategory: string;
  restaurantImageUrl: string;
};

interface AppUser {
  id: number;
  lineUserId: string;
  displayName: string;
  pictureUrl?: string;
  dietaryRestrictions: string[];
  cuisinePreferences: string[];
  defaultBudget: number;
  gender?: string;
  ageGroup?: string;
  partnerLineUserId?: string;
}

export default function AdminUsers() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"admins" | "owners" | "app_users">("admins");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserSafe | null>(null);
  const [formData, setFormData] = useState<UserFormData>(emptyForm);
  const [ownerSearch, setOwnerSearch] = useState("");
  const [ownerStatusFilter, setOwnerStatusFilter] = useState("all");
  const [reviewClaim, setReviewClaim] = useState<ClaimEntry | null>(null);
  const [ownerProcessing, setOwnerProcessing] = useState(false);
  const [appUserSearch, setAppUserSearch] = useState("");

  const { data: claims = [], isLoading: claimsLoading } = useQuery<ClaimEntry[]>({
    queryKey: ["/api/admin/claims"],
    enabled: activeTab === "owners",
  });

  const { data: appUsers = [], isLoading: appUsersLoading } = useQuery<AppUser[]>({
    queryKey: ["/api/admin/users"],
    enabled: activeTab === "app_users",
  });

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
    const roleKey = role as keyof typeof ROLE_DEFAULT_PERMISSIONS;
    setFormData({
      ...formData,
      role,
      permissions: [...(ROLE_DEFAULT_PERMISSIONS[roleKey] || [])],
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

  const filteredClaims = claims.filter(c => {
    const matchSearch = !ownerSearch ||
      c.ownerName.toLowerCase().includes(ownerSearch.toLowerCase()) ||
      c.ownerEmail.toLowerCase().includes(ownerSearch.toLowerCase()) ||
      c.restaurantName.toLowerCase().includes(ownerSearch.toLowerCase());
    const matchStatus = ownerStatusFilter === "all" || c.status === ownerStatusFilter;
    return matchSearch && matchStatus;
  });

  const handleClaimReview = async (action: "approve" | "reject") => {
    if (!reviewClaim) return;
    setOwnerProcessing(true);
    try {
      const res = await apiRequest("PATCH", `/api/admin/claims/${reviewClaim.id}`, { status: action === "approve" ? "approved" : "rejected" });
      if (!res.ok) throw new Error("Failed");
      toast({
        title: action === "approve" ? "Claim Approved" : "Claim Rejected",
        description: `${reviewClaim.ownerName}'s claim for ${reviewClaim.restaurantName} has been ${action === "approve" ? "approved" : "rejected"}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/claims"] });
      setReviewClaim(null);
    } catch {
      toast({ title: "Error", description: "Could not update claim", variant: "destructive" });
    } finally {
      setOwnerProcessing(false);
    }
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
            <button
              onClick={() => setActiveTab("app_users")}
              className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-all flex items-center gap-1.5 ${activeTab === "app_users" ? "bg-white text-gray-800 shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              data-testid="tab-app-users"
            >
              <UserCircle className="w-3.5 h-3.5" />
              App Users
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
              { label: "Total Claims", value: claims.length },
              { label: "Approved", value: claims.filter(c => c.status === "approved").length },
              { label: "Pending", value: claims.filter(c => c.status === "pending").length },
              { label: "Rejected", value: claims.filter(c => c.status === "rejected").length },
            ].map(kpi => (
              <Card key={kpi.label} className="p-4" data-testid={`card-owner-kpi-${kpi.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{kpi.label}</p>
                <p className="text-2xl font-bold tracking-tight text-gray-800">{claimsLoading ? "…" : kpi.value}</p>
              </Card>
            ))}
          </div>

          <Card className="p-0 overflow-hidden" data-testid="section-owners-table">
            <div className="flex items-center gap-3 p-4 border-b border-gray-100 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search owner or restaurant..."
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
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              {claimsLoading ? (
                <div className="space-y-2 p-4">{[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}</div>
              ) : filteredClaims.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-2">
                  <Store className="w-6 h-6 opacity-30" />
                  <span className="text-sm">No claims found</span>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Owner</th>
                      <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Restaurant</th>
                      <th className="text-center py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</th>
                      <th className="text-center py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Submitted</th>
                      <th className="text-center py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClaims.map((claim) => (
                      <tr key={claim.id} className="border-b border-gray-100" data-testid={`row-claim-${claim.id}`}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold ${
                              claim.status === "approved" ? "bg-[#00B14F]/10 text-[#00B14F]" :
                              claim.status === "pending" ? "bg-amber-100 text-amber-700" :
                              "bg-red-100 text-red-600"
                            }`}>
                              {claim.ownerName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-medium text-foreground">{claim.ownerName}</span>
                              <p className="text-[10px] text-muted-foreground">{claim.ownerEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-700">{claim.restaurantName}</span>
                          <p className="text-[10px] text-gray-400">{claim.restaurantCategory}</p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            variant="secondary"
                            className={
                              claim.status === "approved" ? "bg-[#00B14F]/10 text-[#00B14F]" :
                              claim.status === "pending" ? "bg-amber-100 text-amber-700" :
                              "bg-red-100 text-red-600"
                            }
                            data-testid={`badge-claim-status-${claim.id}`}
                          >
                            {claim.status === "approved" && <ShieldCheck className="w-3 h-3 mr-1" />}
                            {claim.status === "pending" && <Clock className="w-3 h-3 mr-1" />}
                            {claim.status === "rejected" && <X className="w-3 h-3 mr-1" />}
                            <span className="capitalize">{claim.status}</span>
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center text-xs text-muted-foreground">
                          {new Date(claim.submittedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {claim.status === "pending" && (
                            <button
                              onClick={() => setReviewClaim(claim)}
                              className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors mx-auto"
                              data-testid={`btn-review-claim-${claim.id}`}
                            >
                              <ShieldCheck className="w-3.5 h-3.5" /> Review
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>

          {reviewClaim && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6" data-testid="review-owner-dialog">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-800">Review Ownership Claim</h3>
                  </div>
                  <button onClick={() => setReviewClaim(null)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200" data-testid="btn-close-review-owner">
                    <X className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700">
                      {reviewClaim.ownerName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{reviewClaim.ownerName}</p>
                      <p className="text-xs text-gray-400">{reviewClaim.ownerEmail}</p>
                      {reviewClaim.ownerPhone && <p className="text-xs text-gray-400">{reviewClaim.ownerPhone}</p>}
                    </div>
                  </div>
                  <div className="flex gap-3 p-3 rounded-xl border border-gray-100">
                    {reviewClaim.restaurantImageUrl && (
                      <img src={reviewClaim.restaurantImageUrl} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Claiming Restaurant</p>
                      <p className="text-sm font-medium text-gray-800">{reviewClaim.restaurantName}</p>
                      <p className="text-xs text-gray-400">{reviewClaim.restaurantCategory} · {reviewClaim.restaurantAddress}</p>
                      <p className="text-xs text-gray-400 mt-1">Submitted: {new Date(reviewClaim.submittedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
                  <button onClick={() => setReviewClaim(null)} className="px-4 py-2 text-sm text-gray-500 rounded-lg" data-testid="btn-cancel-review-owner">Cancel</button>
                  <button
                    onClick={() => handleClaimReview("reject")}
                    disabled={ownerProcessing}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50"
                    data-testid="btn-reject-owner-claim"
                  >
                    {ownerProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                    Reject
                  </button>
                  <button
                    onClick={() => handleClaimReview("approve")}
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

      {activeTab === "app_users" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="section-app-user-kpis">
            {[
              { label: "Total Users", value: appUsers.length },
              { label: "With Preferences", value: appUsers.filter(u => u.cuisinePreferences?.length > 0).length },
              { label: "With Partner", value: appUsers.filter(u => !!u.partnerLineUserId).length },
              { label: "Dietary Restrictions", value: appUsers.filter(u => u.dietaryRestrictions?.length > 0).length },
            ].map(kpi => (
              <Card key={kpi.label} className="p-4" data-testid={`card-app-user-kpi-${kpi.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{kpi.label}</p>
                <p className="text-2xl font-bold tracking-tight text-gray-800">{appUsersLoading ? "…" : kpi.value}</p>
              </Card>
            ))}
          </div>

          <Card className="p-0 overflow-hidden" data-testid="section-app-users-table">
            <div className="flex items-center gap-3 p-4 border-b border-gray-100 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or LINE ID..."
                  value={appUserSearch}
                  onChange={(e) => setAppUserSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-app-users"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              {appUsersLoading ? (
                <div className="space-y-2 p-4">{[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}</div>
              ) : appUsers.filter(u =>
                  !appUserSearch ||
                  u.displayName.toLowerCase().includes(appUserSearch.toLowerCase()) ||
                  u.lineUserId.toLowerCase().includes(appUserSearch.toLowerCase())
                ).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-2">
                  <UserCircle className="w-6 h-6 opacity-30" />
                  <span className="text-sm">No app users found</span>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">User</th>
                      <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Preferences</th>
                      <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Budget</th>
                      <th className="text-center py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Partner</th>
                      <th className="text-center py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Analytics</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appUsers
                      .filter(u =>
                        !appUserSearch ||
                        u.displayName.toLowerCase().includes(appUserSearch.toLowerCase()) ||
                        u.lineUserId.toLowerCase().includes(appUserSearch.toLowerCase())
                      )
                      .map(user => (
                        <tr key={user.lineUserId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors" data-testid={`row-app-user-${user.lineUserId}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {user.pictureUrl ? (
                                <img src={user.pictureUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                  <UserCircle className="w-5 h-5 text-gray-400" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-gray-800 text-sm">{user.displayName}</p>
                                <p className="text-[10px] text-gray-400 font-mono">{user.lineUserId.slice(0, 16)}…</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {(user.cuisinePreferences || []).slice(0, 3).map(p => (
                                <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>
                              ))}
                              {(user.cuisinePreferences || []).length > 3 && (
                                <Badge variant="outline" className="text-[10px]">+{(user.cuisinePreferences || []).length - 3}</Badge>
                              )}
                              {(user.cuisinePreferences || []).length === 0 && (
                                <span className="text-[11px] text-gray-300">—</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-700">
                            {user.defaultBudget ? `฿${user.defaultBudget.toLocaleString()}` : "—"}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {user.partnerLineUserId ? (
                              <Badge variant="secondary" className="bg-purple-50 text-purple-700 text-[10px]">Paired</Badge>
                            ) : (
                              <span className="text-[11px] text-gray-300">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => navigate(`/admin/users/${user.lineUserId}`)}
                              className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-[var(--admin-blue-10)] text-[var(--admin-blue)] hover:bg-blue-100 transition-colors mx-auto"
                              data-testid={`btn-view-analytics-${user.lineUserId}`}
                            >
                              View Analytics <ChevronRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
