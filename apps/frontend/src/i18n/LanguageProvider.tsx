import React, { createContext, useContext, useState, useCallback } from "react";

type Lang = "en" | "th";

interface LanguageContextType {
  language: Lang;
  setLanguage: (lang: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const STORAGE_KEY = "toast_lang";

const translations: Record<Lang, Record<string, string>> = {
  en: {
    // Navigation
    "nav.explore": "Explore",
    "nav.swipe": "Swipe",
    "nav.saved": "Saved",
    "nav.profile": "Profile",
    "nav.back": "Back",

    // Auth
    "auth.line_unavailable": "LINE login unavailable",
    "auth.set_liff_id": "Set `VITE_LIFF_ID` to enable personalized routes.",
    "auth.redirecting": "Redirecting to LINE login...",
    "auth.required": "Authentication is required for personalized experience.",

    // Errors
    "error.404_title": "404 Page Not Found",
    "error.404_desc": "Did you forget to add the page to the router?",
    "error.page_not_found": "404 — Page not found",

    // Home
    "home.greeting.breakfast": "what's for breakfast?",
    "home.greeting.lunch": "what's for lunch?",
    "home.greeting.hungry": "feeling hungry?",
    "home.greeting.dinner": "what's for dinner?",
    "home.greeting.latenight": "late night craving?",
    "home.current_location": "Current Location",
    "home.loading": "Loading...",

    // Filters
    "filter.top_rated": "Top Rated",
    "filter.nearest": "Nearest",
    "filter.price_low": "Price: Low",
    "filter.price_high": "Price: High",
    "filter.trending": "Trending",
    "filter.halal": "Halal",
    "filter.vegetarian": "Vegetarian",
    "filter.vegan": "Vegan",
    "filter.gluten_free": "Gluten Free",
    "filter.500m": "< 500m",
    "filter.1km": "< 1 km",
    "filter.3km": "< 3 km",
    "filter.5km": "< 5 km",

    // Vibes
    "vibe.trending": "Trending",
    "vibe.hot": "Spicy",
    "vibe.drinks": "Drinks",
    "vibe.cheap": "Budget",
    "vibe.healthy": "Healthy",
    "vibe.outdoor": "Outdoor",
    "vibe.partner": "Date Night",
    "vibe.delivery": "Delivery",
    "vibe.late": "Late Night",
    "vibe.sweet": "Sweets",
    "vibe.brunch": "Brunch",
    "vibe.streetfood": "Street Food",
    "vibe.rooftop": "Rooftop",
    "vibe.family": "Family",
    "vibe.cafe": "Cafe",

    // Saved
    "saved.title": "Saved",
    "saved.count_one": "{{count}} restaurant in your list",
    "saved.count_other": "{{count}} restaurants in your list",
    "saved.loading": "Loading saved places...",
    "saved.empty_title": "No saved places yet",
    "saved.empty_desc": "Tap the heart on any restaurant to save it for later.",

    // Solo Results
    "solo.choose_title": "Which one sounds better?",
    "solo.drinks_title": "What are we drinking?",
    "solo.choose_hint": "Tap to pick — the other gets replaced",
    "solo.drinks_hint": "Tap to pick your drink",
    "solo.no_options": "No live menu options available yet. Try again after restaurants are loaded.",
    "solo.current_pick": "Current pick:",
    "solo.current_drink": "Current drink:",
    "solo.places": "{{count}} places",
    "solo.ready_eat": "Ready to eat!",
    "solo.ready_drink": "Ready to drink!",
    "solo.share": "Share result",
    "solo.search": "Search",
    "solo.decide": "Decide for me",
    "solo.swipe": "Swipe",
    "solo.thinking": "Toast is thinking...",
    "solo.mixing": "Toast is mixing...",
    "solo.suggests": "Toast suggests",
    "solo.based_on": "Based on your taste, time & trends",
    "solo.weekend": "Weekend vibes",
    "solo.payday": "Treat yourself",
    "solo.places_nearby": "{{count}} places nearby",
    "solo.why_pick": "Why this pick",
    "solo.lets_go": "Let's go — {{name}}",
    "solo.keep_choosing": "I'll keep choosing myself",
    "solo.toast_pick": "Toast Pick",
    "solo.no_option": "No option",
    "solo.preferences": "Your preferences",

    // Group Setup
    "group.setup_title": "Set up your session",
    "group.setup_subtitle": "Customize before you start swiping",
    "group.when": "When?",
    "group.where": "Where?",
    "group.budget": "Budget",
    "group.dietary": "Dietary needs",
    "group.who": "Who's coming?",
    "group.mode": "Swipe mode",
    "group.optional": "Optional",
    "group.clear": "Clear",
    "group.time": "Time",
    "group.today": "Today",
    "group.start_session": "Start Session",
    "group.invite_line": "Invite via LINE",
    "group.invite_sending": "Opening LINE...",
    "group.invite_sent": "Invite Sent!",
    "group.invite_select": "Select friends to invite",
    "group.invite_send": "Send to friends or group chat",

    // Group locations
    "loc.bts": "Near BTS",
    "loc.bts_sub": "Easy access",
    "loc.mall": "At the mall",
    "loc.mall_sub": "Indoor vibes",
    "loc.street": "Street food",
    "loc.street_sub": "Local flavor",
    "loc.rooftop": "Rooftop",
    "loc.rooftop_sub": "Sky high",
    "loc.riverside": "Riverside",
    "loc.riverside_sub": "Scenic views",
    "loc.latenight": "Late night",
    "loc.latenight_sub": "After hours",

    // Budgets
    "budget.cheap": "Cheap eats",
    "budget.mid": "Mid range",
    "budget.fancy": "Fancy",
    "budget.splurge": "Splurge",

    // Group types
    "group_type.friends": "Friends",
    "group_type.partner": "Partner",
    "group_type.family": "Family",
    "group_type.coworkers": "Coworkers",

    // Swipe modes
    "swipe_mode.restaurant": "Swipe Restaurants",
    "swipe_mode.restaurant_sub": "Pick places directly",
    "swipe_mode.menu": "Swipe Dishes",
    "swipe_mode.menu_sub": "Match on food first",

    // Dietary restrictions
    "diet.halal": "Halal",
    "diet.vegan": "Vegan",
    "diet.vegetarian": "Vegetarian",
    "diet.gluten_free": "Gluten-Free",
    "diet.no_pork": "No Pork",
    "diet.keto": "Keto",
    "diet.dairy_free": "Dairy-Free",
    "diet.nut_free": "Nut-Free",

    // Waiting Room
    "waiting.waiting": "Waiting for friends...",
    "waiting.ready": "Ready to go!",
    "waiting.joined": "{{count}} joined",
    "waiting.member_ready": "Ready",
    "waiting.member_not_joined": "Not joined yet",
    "waiting.nudge": "Nudge",
    "waiting.nudged": "Nudged",
    "waiting.start": "Start Swiping!",
    "waiting.waiting_more": "Waiting for more friends...",
    "waiting.session_code": "Session code:",
    "waiting.invite": "Invite",
    "waiting.via_line": "via LINE",
    "waiting.no_session": "No session ID found. Start a new group from the home page.",
    "waiting.start_new_group": "Start New Group",
    "waiting.you": "You",

    // Group Result
    "group_result.title": "Group Top 3",
    "group_result.session": "Session {{code}}",
    "group_result.agree": "agree",
    "group_result.open_restaurants": "View Restaurants for This Dish",
    "group_result.open_winner": "Open Winner",
    "group_result.share": "Share to LINE",
    "group_result.final_vote": "Final Vote",

    // Language toggle
    "lang.toggle": "TH",
  },

  th: {
    // Navigation
    "nav.explore": "สำรวจ",
    "nav.swipe": "สไวป์",
    "nav.saved": "บันทึก",
    "nav.profile": "โปรไฟล์",
    "nav.back": "ย้อนกลับ",

    // Auth
    "auth.line_unavailable": "ไม่สามารถเข้าสู่ระบบ LINE ได้",
    "auth.set_liff_id": "ตั้งค่า `VITE_LIFF_ID` เพื่อเปิดใช้งาน",
    "auth.redirecting": "กำลังไปหน้า LINE login...",
    "auth.required": "ต้องเข้าสู่ระบบเพื่อใช้งานแบบส่วนตัว",

    // Errors
    "error.404_title": "ไม่พบหน้าที่ต้องการ",
    "error.404_desc": "ลืมเพิ่มหน้านี้ใน router หรือเปล่า?",
    "error.page_not_found": "404 — ไม่พบหน้า",

    // Home
    "home.greeting.breakfast": "เช้านี้กินอะไรดี?",
    "home.greeting.lunch": "มื้อเที่ยงกินอะไรดี?",
    "home.greeting.hungry": "หิวแล้วหรือยัง?",
    "home.greeting.dinner": "มื้อเย็นกินอะไรดี?",
    "home.greeting.latenight": "ดึกแล้วยังอยากกิน?",
    "home.current_location": "ตำแหน่งปัจจุบัน",
    "home.loading": "กำลังโหลด...",

    // Filters
    "filter.top_rated": "คะแนนสูงสุด",
    "filter.nearest": "ใกล้ที่สุด",
    "filter.price_low": "ราคา: ถูก",
    "filter.price_high": "ราคา: แพง",
    "filter.trending": "กำลังฮิต",
    "filter.halal": "ฮาลาล",
    "filter.vegetarian": "มังสวิรัติ",
    "filter.vegan": "วีแกน",
    "filter.gluten_free": "ไม่มีกลูเตน",
    "filter.500m": "< 500ม.",
    "filter.1km": "< 1 กม.",
    "filter.3km": "< 3 กม.",
    "filter.5km": "< 5 กม.",

    // Vibes
    "vibe.trending": "กำลังฮิต",
    "vibe.hot": "เผ็ดร้อน",
    "vibe.drinks": "เครื่องดื่ม",
    "vibe.cheap": "ประหยัด",
    "vibe.healthy": "เพื่อสุขภาพ",
    "vibe.outdoor": "กลางแจ้ง",
    "vibe.partner": "ดินเนอร์คู่",
    "vibe.delivery": "เดลิเวอรี่",
    "vibe.late": "กินดึก",
    "vibe.sweet": "ของหวาน",
    "vibe.brunch": "บรันช์",
    "vibe.streetfood": "อาหารข้างทาง",
    "vibe.rooftop": "รูฟท็อป",
    "vibe.family": "ครอบครัว",
    "vibe.cafe": "คาเฟ่",

    // Saved
    "saved.title": "บันทึกไว้",
    "saved.count_one": "{{count}} ร้านอาหารในรายการ",
    "saved.count_other": "{{count}} ร้านอาหารในรายการ",
    "saved.loading": "กำลังโหลดสถานที่บันทึกไว้...",
    "saved.empty_title": "ยังไม่มีสถานที่บันทึก",
    "saved.empty_desc": "แตะหัวใจที่ร้านอาหารเพื่อบันทึกไว้ดูทีหลัง",

    // Solo Results
    "solo.choose_title": "อันไหนดูน่ากินกว่ากัน?",
    "solo.drinks_title": "จะดื่มอะไรดี?",
    "solo.choose_hint": "แตะเพื่อเลือก — อีกอันจะเปลี่ยนใหม่",
    "solo.drinks_hint": "แตะเพื่อเลือกเครื่องดื่ม",
    "solo.no_options": "ยังไม่มีเมนูพร้อมใช้งาน กรุณาลองใหม่อีกครั้ง",
    "solo.current_pick": "เลือกอยู่:",
    "solo.current_drink": "เครื่องดื่มที่เลือก:",
    "solo.places": "{{count}} สถานที่",
    "solo.ready_eat": "พร้อมกินแล้ว!",
    "solo.ready_drink": "พร้อมดื่มแล้ว!",
    "solo.share": "แชร์ผลลัพธ์",
    "solo.search": "ค้นหา",
    "solo.decide": "ให้ Toast เลือกให้",
    "solo.swipe": "สไวป์",
    "solo.thinking": "Toast กำลังคิด...",
    "solo.mixing": "Toast กำลังผสม...",
    "solo.suggests": "Toast แนะนำ",
    "solo.based_on": "อ้างอิงจากรสนิยม เวลา และความฮิต",
    "solo.weekend": "บรรยากาศวันหยุด",
    "solo.payday": "รางวัลให้ตัวเอง",
    "solo.places_nearby": "{{count}} สถานที่ใกล้เคียง",
    "solo.why_pick": "ทำไมถึงแนะนำ",
    "solo.lets_go": "ไปเลย — {{name}}",
    "solo.keep_choosing": "ฉันขอเลือกเองดีกว่า",
    "solo.toast_pick": "Toast เลือก",
    "solo.no_option": "ไม่มีตัวเลือก",
    "solo.preferences": "ความต้องการของคุณ",

    // Group Setup
    "group.setup_title": "ตั้งค่าเซสชันกลุ่ม",
    "group.setup_subtitle": "ปรับแต่งก่อนเริ่มสไวป์",
    "group.when": "เมื่อไหร่?",
    "group.where": "ที่ไหน?",
    "group.budget": "งบประมาณ",
    "group.dietary": "ข้อจำกัดด้านอาหาร",
    "group.who": "ใครมาบ้าง?",
    "group.mode": "โหมดสไวป์",
    "group.optional": "ไม่บังคับ",
    "group.clear": "ล้าง",
    "group.time": "เวลา",
    "group.today": "วันนี้",
    "group.start_session": "เริ่มเซสชัน",
    "group.invite_line": "เชิญผ่าน LINE",
    "group.invite_sending": "กำลังเปิด LINE...",
    "group.invite_sent": "ส่งคำเชิญแล้ว!",
    "group.invite_select": "เลือกเพื่อนที่จะเชิญ",
    "group.invite_send": "ส่งให้เพื่อนหรือกลุ่มแชท",

    // Group locations
    "loc.bts": "ใกล้ BTS",
    "loc.bts_sub": "เดินทางสะดวก",
    "loc.mall": "ในห้าง",
    "loc.mall_sub": "บรรยากาศในร่ม",
    "loc.street": "อาหารข้างทาง",
    "loc.street_sub": "รสชาติท้องถิ่น",
    "loc.rooftop": "รูฟท็อป",
    "loc.rooftop_sub": "วิวสูง",
    "loc.riverside": "ริมแม่น้ำ",
    "loc.riverside_sub": "วิวสวยงาม",
    "loc.latenight": "ดึก",
    "loc.latenight_sub": "หลังเที่ยงคืน",

    // Budgets
    "budget.cheap": "ประหยัด",
    "budget.mid": "ระดับกลาง",
    "budget.fancy": "หรูหรา",
    "budget.splurge": "ฟุ่มเฟือย",

    // Group types
    "group_type.friends": "เพื่อน",
    "group_type.partner": "คู่รัก",
    "group_type.family": "ครอบครัว",
    "group_type.coworkers": "เพื่อนร่วมงาน",

    // Swipe modes
    "swipe_mode.restaurant": "สไวป์ร้านอาหาร",
    "swipe_mode.restaurant_sub": "เลือกร้านโดยตรง",
    "swipe_mode.menu": "สไวป์เมนู",
    "swipe_mode.menu_sub": "จับคู่อาหารก่อน",

    // Dietary restrictions
    "diet.halal": "ฮาลาล",
    "diet.vegan": "วีแกน",
    "diet.vegetarian": "มังสวิรัติ",
    "diet.gluten_free": "ไม่มีกลูเตน",
    "diet.no_pork": "ไม่มีหมู",
    "diet.keto": "คีโต",
    "diet.dairy_free": "ไม่มีนม",
    "diet.nut_free": "ไม่มีถั่ว",

    // Waiting Room
    "waiting.waiting": "รอเพื่อนอยู่...",
    "waiting.ready": "พร้อมแล้ว!",
    "waiting.joined": "{{count}} คนเข้าร่วม",
    "waiting.member_ready": "พร้อม",
    "waiting.member_not_joined": "ยังไม่ได้เข้าร่วม",
    "waiting.nudge": "แตะ",
    "waiting.nudged": "แตะแล้ว",
    "waiting.start": "เริ่มสไวป์!",
    "waiting.waiting_more": "รอเพื่อนเพิ่มอีก...",
    "waiting.session_code": "รหัสเซสชัน:",
    "waiting.invite": "เชิญ",
    "waiting.via_line": "ผ่าน LINE",
    "waiting.no_session": "ไม่พบรหัสเซสชัน กรุณาสร้างกลุ่มใหม่จากหน้าหลัก",
    "waiting.start_new_group": "สร้างกลุ่มใหม่",
    "waiting.you": "คุณ",

    // Group Result
    "group_result.title": "3 อันดับแรกของกลุ่ม",
    "group_result.session": "เซสชัน {{code}}",
    "group_result.agree": "เห็นด้วย",
    "group_result.open_restaurants": "ดูร้านที่มีเมนูนี้",
    "group_result.open_winner": "ดูผู้ชนะ",
    "group_result.share": "แชร์ไปยัง LINE",
    "group_result.final_vote": "โหวตรอบสุดท้าย",

    // Language toggle
    "lang.toggle": "EN",
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
