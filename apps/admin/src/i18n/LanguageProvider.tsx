import React, { createContext, useContext, useState, useCallback } from "react";

type Lang = "en" | "th";

interface LanguageContextType {
  language: Lang;
  setLanguage: (lang: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const STORAGE_KEY = "toast_admin_lang";

const translations: Record<Lang, Record<string, string>> = {
  en: {
    // Navigation groups
    "nav.overview": "Overview",
    "nav.management": "Management",
    "nav.customers": "Customers",
    "nav.analytics": "Analytics",
    "nav.intelligence": "Intelligence",
    "nav.operations": "Operations",
    "nav.monetization": "Monetization",
    "nav.system": "System",
    "nav.owner_portal": "Owner Portal",

    // Nav items
    "nav.dashboard": "Dashboard",
    "nav.owners": "Owners",
    "nav.restaurants": "Restaurants",
    "nav.menus": "Menus",
    "nav.campaigns": "Campaigns",
    "nav.banners": "Banners",
    "nav.users": "Users",
    "nav.analytics_page": "Analytics",
    "nav.food_trends": "Food Trends",
    "nav.geography": "Geography",
    "nav.recommendations": "Recommendations",
    "nav.experiments": "Experiments",
    "nav.ml_status": "ML Status",
    "nav.predictive": "Predictive Intel",
    "nav.customer_analytics": "Customer Analytics",
    "nav.swipe_sessions": "Swipe Sessions",
    "nav.data_ops": "Data Ops",
    "nav.operations_page": "Operations",
    "nav.reports": "Reports",
    "nav.integrations": "Integrations",
    "nav.audit_logs": "Audit Logs",
    "nav.security": "Security Audit",
    "nav.payments": "Payments",
    "nav.partner_clickouts": "Partner Clickouts",
    "nav.config": "Config",
    "nav.sessions": "Sessions",
    "nav.places": "Places",

    // Owner nav
    "owner.dashboard": "My Restaurant",
    "owner.menu": "Menu",
    "owner.reviews": "Reviews",
    "owner.promotions": "Promotions",
    "owner.performance": "Performance",
    "owner.notifications": "Notifications",
    "owner.settings": "Settings",
    "owner.billing": "Billing",
    "owner.insights": "AI Insights",
    "owner.customer_insights": "Customer Insights",
    "owner.decision_intel": "Decision Intel",
    "owner.delivery": "Delivery Conversions",
    "owner.support": "Support",

    // Layout
    "layout.admin_panel": "Admin Panel",
    "layout.owner_portal": "Owner Portal",
    "layout.logout": "Log out",
    "layout.view_app": "View App",
    "layout.language": "TH",

    // Common
    "common.loading": "Loading...",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.add": "Add",
    "common.search": "Search",
    "common.filter": "Filter",
    "common.export": "Export",
    "common.import": "Import",
    "common.confirm": "Confirm",
    "common.back": "Back",
    "common.next": "Next",
    "common.submit": "Submit",
    "common.refresh": "Refresh",
    "common.yes": "Yes",
    "common.no": "No",
    "common.status": "Status",
    "common.actions": "Actions",
    "common.name": "Name",
    "common.email": "Email",
    "common.date": "Date",
    "common.active": "Active",
    "common.inactive": "Inactive",
    "common.enabled": "Enabled",
    "common.disabled": "Disabled",
    "common.error": "Error",
    "common.success": "Success",
    "common.warning": "Warning",
    "common.total": "Total",
    "common.none": "None",
    "common.all": "All",
    "common.page_not_found": "404 — Page not found",

    // Dashboard
    "dashboard.title": "Dashboard",
    "dashboard.welcome": "Welcome back",
    "dashboard.total_restaurants": "Total Restaurants",
    "dashboard.total_users": "Total Users",
    "dashboard.total_sessions": "Total Sessions",
    "dashboard.active_campaigns": "Active Campaigns",

    // DataOps
    "dataops.missing_images": "Missing Images",
    "dataops.missing_tags": "Missing Tags",
    "dataops.no_price": "No Price Listed",
    "dataops.invalid_links": "Invalid Links",
    "dataops.duplicates": "Duplicate Restaurants",
    "dataops.stale_data": "Stale Data (>90d)",
    "dataops.review_images": "Review & add images",
    "dataops.auto_tags": "Auto-assign tags",
    "dataops.request_owners": "Request from owners",
    "dataops.validate_urls": "Validate & fix URLs",
    "dataops.merge_dupes": "Merge duplicates",
    "dataops.trigger_sync": "Trigger sync",

    // Login
    "login.title": "Admin Login",
    "login.username": "Username",
    "login.password": "Password",
    "login.sign_in": "Sign In",
    "login.signing_in": "Signing in...",
    "login.error": "Invalid credentials",
  },

  th: {
    // Navigation groups
    "nav.overview": "ภาพรวม",
    "nav.management": "การจัดการ",
    "nav.customers": "ลูกค้า",
    "nav.analytics": "วิเคราะห์",
    "nav.intelligence": "ข้อมูลเชิงลึก",
    "nav.operations": "การดำเนินงาน",
    "nav.monetization": "รายได้",
    "nav.system": "ระบบ",
    "nav.owner_portal": "พอร์ทัลเจ้าของ",

    // Nav items
    "nav.dashboard": "แดชบอร์ด",
    "nav.owners": "เจ้าของร้าน",
    "nav.restaurants": "ร้านอาหาร",
    "nav.menus": "เมนู",
    "nav.campaigns": "แคมเปญ",
    "nav.banners": "แบนเนอร์",
    "nav.users": "ผู้ใช้",
    "nav.analytics_page": "วิเคราะห์",
    "nav.food_trends": "เทรนด์อาหาร",
    "nav.geography": "ภูมิศาสตร์",
    "nav.recommendations": "คำแนะนำ",
    "nav.experiments": "การทดสอบ",
    "nav.ml_status": "สถานะ ML",
    "nav.predictive": "ข้อมูลเชิงพยากรณ์",
    "nav.customer_analytics": "วิเคราะห์ลูกค้า",
    "nav.swipe_sessions": "เซสชันสไวป์",
    "nav.data_ops": "จัดการข้อมูล",
    "nav.operations_page": "การดำเนินงาน",
    "nav.reports": "รายงาน",
    "nav.integrations": "การเชื่อมต่อ",
    "nav.audit_logs": "บันทึกการตรวจสอบ",
    "nav.security": "ความปลอดภัย",
    "nav.payments": "การชำระเงิน",
    "nav.partner_clickouts": "คลิกพาร์ทเนอร์",
    "nav.config": "ตั้งค่า",
    "nav.sessions": "เซสชัน",
    "nav.places": "สถานที่",

    // Owner nav
    "owner.dashboard": "ร้านของฉัน",
    "owner.menu": "เมนู",
    "owner.reviews": "รีวิว",
    "owner.promotions": "โปรโมชัน",
    "owner.performance": "ประสิทธิภาพ",
    "owner.notifications": "การแจ้งเตือน",
    "owner.settings": "การตั้งค่า",
    "owner.billing": "การเรียกเก็บเงิน",
    "owner.insights": "AI Insights",
    "owner.customer_insights": "ข้อมูลลูกค้า",
    "owner.decision_intel": "ข้อมูลตัดสินใจ",
    "owner.delivery": "การแปลงเดลิเวอรี่",
    "owner.support": "ติดต่อสนับสนุน",

    // Layout
    "layout.admin_panel": "แผงผู้ดูแล",
    "layout.owner_portal": "พอร์ทัลเจ้าของ",
    "layout.logout": "ออกจากระบบ",
    "layout.view_app": "ดูแอป",
    "layout.language": "EN",

    // Common
    "common.loading": "กำลังโหลด...",
    "common.save": "บันทึก",
    "common.cancel": "ยกเลิก",
    "common.delete": "ลบ",
    "common.edit": "แก้ไข",
    "common.add": "เพิ่ม",
    "common.search": "ค้นหา",
    "common.filter": "กรอง",
    "common.export": "ส่งออก",
    "common.import": "นำเข้า",
    "common.confirm": "ยืนยัน",
    "common.back": "ย้อนกลับ",
    "common.next": "ถัดไป",
    "common.submit": "ส่ง",
    "common.refresh": "รีเฟรช",
    "common.yes": "ใช่",
    "common.no": "ไม่",
    "common.status": "สถานะ",
    "common.actions": "การดำเนินการ",
    "common.name": "ชื่อ",
    "common.email": "อีเมล",
    "common.date": "วันที่",
    "common.active": "ใช้งาน",
    "common.inactive": "ไม่ใช้งาน",
    "common.enabled": "เปิดใช้",
    "common.disabled": "ปิดใช้",
    "common.error": "ข้อผิดพลาด",
    "common.success": "สำเร็จ",
    "common.warning": "คำเตือน",
    "common.total": "ทั้งหมด",
    "common.none": "ไม่มี",
    "common.all": "ทั้งหมด",
    "common.page_not_found": "404 — ไม่พบหน้า",

    // Dashboard
    "dashboard.title": "แดชบอร์ด",
    "dashboard.welcome": "ยินดีต้อนรับกลับ",
    "dashboard.total_restaurants": "ร้านอาหารทั้งหมด",
    "dashboard.total_users": "ผู้ใช้ทั้งหมด",
    "dashboard.total_sessions": "เซสชันทั้งหมด",
    "dashboard.active_campaigns": "แคมเปญที่ใช้งาน",

    // DataOps
    "dataops.missing_images": "รูปภาพที่หายไป",
    "dataops.missing_tags": "แท็กที่หายไป",
    "dataops.no_price": "ไม่มีราคา",
    "dataops.invalid_links": "ลิงก์ไม่ถูกต้อง",
    "dataops.duplicates": "ร้านอาหารซ้ำ",
    "dataops.stale_data": "ข้อมูลเก่า (>90 วัน)",
    "dataops.review_images": "ตรวจสอบและเพิ่มรูปภาพ",
    "dataops.auto_tags": "กำหนดแท็กอัตโนมัติ",
    "dataops.request_owners": "ขอจากเจ้าของร้าน",
    "dataops.validate_urls": "ตรวจสอบและแก้ไข URL",
    "dataops.merge_dupes": "รวมรายการซ้ำ",
    "dataops.trigger_sync": "เริ่มซิงค์",

    // Login
    "login.title": "เข้าสู่ระบบผู้ดูแล",
    "login.username": "ชื่อผู้ใช้",
    "login.password": "รหัสผ่าน",
    "login.sign_in": "เข้าสู่ระบบ",
    "login.signing_in": "กำลังเข้าสู่ระบบ...",
    "login.error": "ข้อมูลประจำตัวไม่ถูกต้อง",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Lang>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "th") return stored;
    } catch {}
    return "en";
  });

  const setLanguage = useCallback((lang: Lang) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {}
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      let text = translations[language]?.[key] ?? translations["en"]?.[key] ?? key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(`{{${k}}}`, String(v));
        });
      }
      return text;
    },
    [language],
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
