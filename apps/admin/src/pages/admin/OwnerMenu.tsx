import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getAdminSession } from "./AdminLayout";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { VIBE_TAGS, VIBE_LABELS, VIBE_EMOJI, BANGKOK_DISTRICTS } from "@shared/vibeConfig";
import {
  UtensilsCrossed,
  Clock,
  MapPin,
  Save,
  Sparkles,
  Loader2,
  Plus,
  Trash2,
  GripVertical,
  Image as ImageIcon,
  DollarSign,
  Tag,
} from "lucide-react";

function getOwnerHeaders() {
  const session = getAdminSession();
  if (!session || session.sessionType !== "owner") return {};
  return { "x-owner-token": btoa(`${session.email}:`) };
}

interface MenuCategory {
  name: string;
  items: MenuItem[];
}

interface MenuItem {
  name: string;
  price: string;
  description: string;
}

export default function OwnerMenu() {
  const session = getAdminSession();
  const { toast } = useToast();
  const [editingHours, setEditingHours] = useState(false);
  const [hours, setHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>({
    monday: { open: "09:00", close: "22:00", closed: false },
    tuesday: { open: "09:00", close: "22:00", closed: false },
    wednesday: { open: "09:00", close: "22:00", closed: false },
    thursday: { open: "09:00", close: "22:00", closed: false },
    friday: { open: "09:00", close: "23:00", closed: false },
    saturday: { open: "10:00", close: "23:00", closed: false },
    sunday: { open: "10:00", close: "21:00", closed: false },
  });

  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([
    {
      name: "Signature Dishes",
      items: [
        { name: "Pad Thai Special", price: "180", description: "With fresh prawns and tofu" },
        { name: "Green Curry", price: "220", description: "With coconut cream and Thai basil" },
      ],
    },
    {
      name: "Drinks",
      items: [
        { name: "Thai Iced Tea", price: "80", description: "Traditional sweet tea" },
        { name: "Fresh Coconut", price: "90", description: "Young coconut water" },
      ],
    },
  ]);

  const [newCategoryName, setNewCategoryName] = useState("");

  const { data: dashData, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/owner/dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/admin/owner/dashboard", {
        headers: getOwnerHeaders() as Record<string, string>,
      });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: session?.sessionType === "owner",
  });

  const restaurant = dashData?.restaurant;

  const vibes = useMemo(() => {
    if (!restaurant) return [];
    return restaurant.vibes || [];
  }, [restaurant]);

  if (!session || session.sessionType !== "owner") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400" data-testid="text-access-denied">This page is only accessible to restaurant owners.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="owner-menu-loading">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  const addCategory = () => {
    if (!newCategoryName.trim()) return;
    setMenuCategories([...menuCategories, { name: newCategoryName.trim(), items: [] }]);
    setNewCategoryName("");
    toast({ title: "Category added" });
  };

  const addMenuItem = (catIndex: number) => {
    const updated = [...menuCategories];
    updated[catIndex].items.push({ name: "", price: "", description: "" });
    setMenuCategories(updated);
  };

  const updateMenuItem = (catIndex: number, itemIndex: number, field: keyof MenuItem, value: string) => {
    const updated = [...menuCategories];
    updated[catIndex].items[itemIndex][field] = value;
    setMenuCategories(updated);
  };

  const removeMenuItem = (catIndex: number, itemIndex: number) => {
    const updated = [...menuCategories];
    updated[catIndex].items.splice(itemIndex, 1);
    setMenuCategories(updated);
  };

  const removeCategory = (catIndex: number) => {
    const updated = [...menuCategories];
    updated.splice(catIndex, 1);
    setMenuCategories(updated);
  };

  const dayNames = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const dayLabels: Record<string, string> = {
    monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
    friday: "Fri", saturday: "Sat", sunday: "Sun",
  };

  return (
    <div className="space-y-6" data-testid="owner-menu-page">
      <div className="flex items-center gap-3">
        <UtensilsCrossed className="w-5 h-5 text-[#FFCC02]" />
        <div>
          <h2 className="text-xl font-semibold text-gray-800" data-testid="text-menu-title">Menu & Hours</h2>
          <p className="text-xs text-gray-400">Manage your menu items and operating hours</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-operating-hours">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#00B14F]" />
            <h3 className="text-[15px] font-semibold text-gray-800">Operating Hours</h3>
          </div>
          <button
            onClick={() => setEditingHours(!editingHours)}
            className="text-xs font-medium text-[#FFCC02] hover:text-[#FFCC02]/80 transition-colors"
            data-testid="button-edit-hours"
          >
            {editingHours ? "Done" : "Edit"}
          </button>
        </div>

        <div className="space-y-2">
          {dayNames.map((day) => (
            <div key={day} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
              <span className="text-sm font-medium text-gray-700 w-10">{dayLabels[day]}</span>
              {editingHours ? (
                <div className="flex items-center gap-2 flex-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hours[day].closed}
                      onChange={(e) => setHours({ ...hours, [day]: { ...hours[day], closed: e.target.checked } })}
                      className="rounded border-gray-200 text-[#FFCC02] focus:ring-[#FFCC02]/30"
                      data-testid={`checkbox-closed-${day}`}
                    />
                    <span className="text-xs text-gray-400">Closed</span>
                  </label>
                  {!hours[day].closed && (
                    <>
                      <input
                        type="time"
                        value={hours[day].open}
                        onChange={(e) => setHours({ ...hours, [day]: { ...hours[day], open: e.target.value } })}
                        className="text-sm border border-gray-100 rounded-lg px-2 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#FFCC02]/30"
                        data-testid={`input-open-${day}`}
                      />
                      <span className="text-gray-300">–</span>
                      <input
                        type="time"
                        value={hours[day].close}
                        onChange={(e) => setHours({ ...hours, [day]: { ...hours[day], close: e.target.value } })}
                        className="text-sm border border-gray-100 rounded-lg px-2 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#FFCC02]/30"
                        data-testid={`input-close-${day}`}
                      />
                    </>
                  )}
                </div>
              ) : (
                <span className={`text-sm flex-1 ${hours[day].closed ? "text-red-400" : "text-gray-600"}`}>
                  {hours[day].closed ? "Closed" : `${hours[day].open} – ${hours[day].close}`}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-vibes">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-[#6C2BD9]" />
          <h3 className="text-[15px] font-semibold text-gray-800">Your Vibes</h3>
          <span className="text-xs text-gray-400 ml-1">Auto-assigned based on your restaurant profile</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {VIBE_TAGS.map((tag) => {
            const active = vibes.includes(tag);
            return (
              <span
                key={tag}
                className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-3 py-1.5 transition-all ${
                  active
                    ? "bg-[#FFCC02]/20 border border-[#FFCC02]/40 text-gray-800"
                    : "bg-gray-50 border border-gray-100 text-gray-300"
                }`}
                data-testid={`vibe-tag-${tag}`}
              >
                {VIBE_EMOJI[tag]} {VIBE_LABELS[tag]}
              </span>
            );
          })}
        </div>
        <p className="text-[11px] text-gray-400 mt-3">Contact support to request vibe changes</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-menu-items">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-[#FFCC02]" />
            <h3 className="text-[15px] font-semibold text-gray-800">Menu Items</h3>
            <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
              {menuCategories.reduce((sum, cat) => sum + cat.items.length, 0)} items
            </span>
          </div>
        </div>

        <div className="space-y-5">
          {menuCategories.map((cat, catIndex) => (
            <div key={catIndex} className="border border-gray-100 rounded-xl p-4" data-testid={`menu-category-${catIndex}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700">{cat.name}</span>
                  <span className="text-[10px] text-gray-400">{cat.items.length} items</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => addMenuItem(catIndex)}
                    className="text-xs text-[#00B14F] hover:text-[#00B14F]/80 flex items-center gap-0.5 transition-colors"
                    data-testid={`button-add-item-${catIndex}`}
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                  <button
                    onClick={() => removeCategory(catIndex)}
                    className="text-xs text-gray-300 hover:text-red-400 ml-2 transition-colors"
                    data-testid={`button-remove-category-${catIndex}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {cat.items.length === 0 ? (
                <p className="text-xs text-gray-300 py-3 text-center">No items yet. Click "Add" above.</p>
              ) : (
                <div className="space-y-2">
                  {cat.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="flex items-start gap-2 p-2.5 rounded-lg bg-gray-50/60 border border-gray-50"
                      data-testid={`menu-item-${catIndex}-${itemIndex}`}
                    >
                      <GripVertical className="w-3.5 h-3.5 text-gray-200 mt-2 shrink-0" />
                      <div className="flex-1 grid grid-cols-[1fr_80px] gap-2">
                        <input
                          type="text"
                          placeholder="Item name"
                          value={item.name}
                          onChange={(e) => updateMenuItem(catIndex, itemIndex, "name", e.target.value)}
                          className="text-sm text-gray-700 bg-white border border-gray-100 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#FFCC02]/30"
                          data-testid={`input-item-name-${catIndex}-${itemIndex}`}
                        />
                        <div className="relative">
                          <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-300" />
                          <input
                            type="text"
                            placeholder="฿"
                            value={item.price}
                            onChange={(e) => updateMenuItem(catIndex, itemIndex, "price", e.target.value)}
                            className="text-sm text-gray-700 bg-white border border-gray-100 rounded-lg pl-6 pr-2 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-[#FFCC02]/30"
                            data-testid={`input-item-price-${catIndex}-${itemIndex}`}
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Description (optional)"
                          value={item.description}
                          onChange={(e) => updateMenuItem(catIndex, itemIndex, "description", e.target.value)}
                          className="text-xs text-gray-500 bg-white border border-gray-100 rounded-lg px-2.5 py-1.5 col-span-2 focus:outline-none focus:ring-1 focus:ring-[#FFCC02]/30"
                          data-testid={`input-item-desc-${catIndex}-${itemIndex}`}
                        />
                      </div>
                      <button
                        onClick={() => removeMenuItem(catIndex, itemIndex)}
                        className="text-gray-200 hover:text-red-400 mt-1.5 transition-colors"
                        data-testid={`button-remove-item-${catIndex}-${itemIndex}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="New category name..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
              className="text-sm border border-gray-100 rounded-lg px-3 py-2 flex-1 focus:outline-none focus:ring-1 focus:ring-[#FFCC02]/30"
              data-testid="input-new-category"
            />
            <button
              onClick={addCategory}
              className="bg-[#FFCC02] text-gray-900 text-sm font-medium rounded-lg px-4 py-2 hover:bg-[#FFCC02]/90 transition-colors flex items-center gap-1"
              data-testid="button-add-category"
            >
              <Plus className="w-3.5 h-3.5" /> Add Category
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => toast({ title: "Changes saved", description: "Your menu and hours have been updated." })}
          className="bg-[#FFCC02] text-gray-900 font-medium rounded-xl px-6 py-2.5 hover:bg-[#FFCC02]/90 transition-colors flex items-center gap-2 shadow-sm"
          data-testid="button-save-menu"
        >
          <Save className="w-4 h-4" /> Save Changes
        </button>
      </div>
    </div>
  );
}
