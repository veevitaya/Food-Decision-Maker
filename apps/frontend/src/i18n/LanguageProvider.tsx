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
    "nav.trending": "Trending",
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

    // Profile — header
    "profile.business_label": "Business",
    "profile.business_dashboard": "Business Dashboard",
    "profile.name_placeholder": "Your name",
    "profile.open_in_line": "Open in LINE for full features",
    "profile.connected_line": "Connected via LINE",
    "profile.toggle_diner": "Diner",
    "profile.toggle_owner": "Owner",

    // Profile — partner modal
    "profile.partner_modal_title": "Link Partner",
    "profile.partner_modal_subtitle": "Enter their display name",
    "profile.partner_name_placeholder": "Partner's name",
    "profile.cancel": "Cancel",
    "profile.link": "Link",

    // Profile — dietary section
    "profile.dietary": "Dietary",
    "profile.no_restrictions": "No restrictions",
    "profile.dietary_halal": "Halal",
    "profile.dietary_vegetarian": "Vegetarian",
    "profile.dietary_vegan": "Vegan",
    "profile.dietary_gluten_free": "Gluten Free",
    "profile.dietary_dairy_free": "Dairy Free",
    "profile.dietary_nut_free": "Nut Free",
    "profile.dietary_shellfish_free": "No Shellfish",
    "profile.dietary_pescatarian": "Pescatarian",

    // Profile — cuisines section
    "profile.cuisines": "Cuisines",
    "profile.all_cuisines": "All cuisines",
    "profile.cuisine_thai": "Thai",
    "profile.cuisine_japanese": "Japanese",
    "profile.cuisine_korean": "Korean",
    "profile.cuisine_italian": "Italian",
    "profile.cuisine_mexican": "Mexican",
    "profile.cuisine_indian": "Indian",
    "profile.cuisine_chinese": "Chinese",
    "profile.cuisine_american": "American",
    "profile.cuisine_french": "French",
    "profile.cuisine_vietnamese": "Vietnamese",
    "profile.cuisine_middle_eastern": "Middle Eastern",
    "profile.cuisine_street_food": "Street Food",

    // Profile — settings section
    "profile.settings": "Settings",
    "profile.budget_level": "Budget Level",
    "profile.search_radius": "Search Radius",
    "profile.budget_budget": "Budget",
    "profile.budget_moderate": "Moderate",
    "profile.budget_upscale": "Upscale",
    "profile.budget_fine_dining": "Fine dining",
    "profile.distance_anywhere": "Anywhere",

    // Profile — stats row
    "profile.stats_swipes": "Swipes",
    "profile.stats_liked": "Liked",
    "profile.stats_saved": "Saved",
    "profile.stats_shared": "Shared",

    // Profile — partner row
    "profile.partner": "Partner",
    "profile.partner_invite_hint": "Invite or add a partner",
    "profile.view": "View",
    "profile.invite": "Invite",
    "profile.add": "Add",
    "profile.partner_shared": "{{count}} shared",

    // Profile — saved section
    "profile.saved": "Saved",
    "profile.no_saved_restaurants": "No saved restaurants",
    "profile.saved_summary": "{{mine}} saved · {{partner}} shared",
    "profile.no_saved_yet": "No restaurants saved yet",
    "profile.save_hint": "Tap the heart on any restaurant to save it",

    // Owner dashboard
    "owner.restaurant_setup": "Restaurant Setup",
    "owner.category": "Category",
    "owner.tags": "Tags",
    "owner.address": "Address",
    "owner.photos": "Photos",
    "owner.photos_desc": "Manage your restaurant photos",
    "owner.menus": "Menus",
    "owner.menus_desc": "Add and manage your dishes",
    "owner.add_menu_item": "Add menu item",
    "owner.add_photos_desc": "Add up to 10 photos of your restaurant, food, and ambiance",
    "owner.add_dishes_desc": "Add dishes with photos and prices to appear in swipe cards",
    "owner.restaurant_name_placeholder": "Restaurant name",
    "owner.address_placeholder": "e.g. 123 Sukhumvit Rd, Bangkok",
    "owner.search_category": "Search category...",
    "owner.search_tags": "Search tags...",
    "owner.no_matches": "No matches",
    "owner.no_more_tags": "No more tags",
    "owner.upload": "Upload",
    "owner.performance_snapshot": "Performance Snapshot",
    "owner.todays_activity": "Today's Activity",
    "owner.quick_stats": "Quick Stats",
    "owner.conversion": "Conversion",
    "owner.avg_time": "Avg. Time",
    "owner.returning": "Returning",
    "owner.engagement_funnel": "Engagement Funnel",
    "owner.delivery_breakdown": "Delivery Platform Breakdown",
    "owner.revenue_insights": "Revenue Insights",
    "owner.est_weekly": "Est. Weekly Revenue",
    "owner.proj_monthly": "Projected Monthly",
    "owner.avg_order": "Avg Order",
    "owner.growth": "Growth",
    "owner.audience_demographics": "Audience Demographics",
    "owner.visitor_loyalty": "Visitor Loyalty",
    "owner.category_rank": "Category Rank",
    "owner.restaurants": "restaurants",
    "owner.user_interactions": "User Interactions",
    "owner.full_analytics": "Full Analytics",
    "owner.full_analytics_desc": "Detailed insights, menu stats, and peak hours",
    "owner.tab_overview": "Overview",
    "owner.tab_menu_cards": "Menu Cards",
    "owner.tab_peak_times": "Peak Times",
    "owner.weekly_performance": "Weekly Performance",
    "owner.best_performing_day": "Best performing day",
    "owner.top_menu_swipe": "Top Menu Items by Swipe Performance",
    "owner.menu_insight": "Insight",
    "owner.peak_hours": "Peak Engagement Hours",
    "owner.weekly_heatmap": "Weekly Heatmap",
    "owner.timing_insight": "Timing Insight",
    "owner.promote": "Promote Your Business",
    "owner.campaigns": "Campaigns",
    "owner.new_campaign": "New Campaign",
    "owner.no_campaigns": "No campaigns yet",
    "owner.no_campaigns_desc": "Create your first campaign to attract more diners with special deals",
    "owner.active_badge": "Active",
    "owner.deactivate": "Deactivate",
    "owner.activate_package": "Activate Package",
    "owner.edit_campaign": "Edit Campaign",
    "owner.create_campaign_title": "Create Campaign",
    "owner.campaign_name": "Campaign Name",
    "owner.deal_type": "Deal Type",
    "owner.description": "Description",
    "owner.campaign_duration": "Campaign Duration",
    "owner.start_date": "Start Date",
    "owner.end_date": "End Date",
    "owner.conditions": "Conditions",
    "owner.min_spend": "Min. Spend (฿)",
    "owner.max_redemptions": "Max Redemptions",
    "owner.target_audience": "Target Audience",
    "owner.target_audience_desc": "Select customer segments to target with this campaign",
    "owner.add_custom_group": "Add custom group...",
    "owner.preview": "Preview",
    "owner.preview_label": "Diner Preview",
    "owner.preview_hint": "This is how diners will see your campaign",
    "owner.what_you_get": "What you get",
    "owner.your_featured_dish": "Your Featured Dish",
    "owner.save_changes": "Save Changes",
    "owner.publish": "Publish",
    "owner.failed_analytics": "Failed to load analytics",
    "owner.returning_label": "Returning",
    "owner.avg_visits": "{{count}} avg visits",
    "owner.loyalty": "Loyalty:",
    "owner.top_percentile": "Top",
    "owner.percentile": "percentile",
    "owner.of": "of",
    "owner.day_campaign": "{{count}} day campaign",
    "owner.low": "Low",
    "owner.high": "High",
    "owner.swipes": "swipes",
    "owner.liked": "liked",
    "owner.like_rate": "like rate",
    "owner.segment": "segment",
    "owner.segments": "segments",
    "owner.redemptions_max": "redemptions max",
  },

  th: {
    // Navigation
    "nav.explore": "สำรวจ",
    "nav.swipe": "สไวป์",
    "nav.trending": "ยอดนิยม",
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

    // Profile — header
    "profile.business_label": "ธุรกิจ",
    "profile.business_dashboard": "แดชบอร์ดธุรกิจ",
    "profile.name_placeholder": "ชื่อของคุณ",
    "profile.open_in_line": "เปิดใน LINE เพื่อใช้งานครบฟีเจอร์",
    "profile.connected_line": "เชื่อมต่อผ่าน LINE",
    "profile.toggle_diner": "ผู้ใช้",
    "profile.toggle_owner": "เจ้าของร้าน",

    // Profile — partner modal
    "profile.partner_modal_title": "เชื่อมต่อคู่",
    "profile.partner_modal_subtitle": "กรอกชื่อที่แสดง",
    "profile.partner_name_placeholder": "ชื่อคู่ของคุณ",
    "profile.cancel": "ยกเลิก",
    "profile.link": "เชื่อมต่อ",

    // Profile — dietary section
    "profile.dietary": "อาหาร",
    "profile.no_restrictions": "ไม่มีข้อจำกัด",
    "profile.dietary_halal": "ฮาลาล",
    "profile.dietary_vegetarian": "มังสวิรัติ",
    "profile.dietary_vegan": "วีแกน",
    "profile.dietary_gluten_free": "ไม่มีกลูเตน",
    "profile.dietary_dairy_free": "ไม่มีนม",
    "profile.dietary_nut_free": "ไม่มีถั่ว",
    "profile.dietary_shellfish_free": "ไม่มีอาหารทะเลมีเปลือก",
    "profile.dietary_pescatarian": "กินปลาและผัก",

    // Profile — cuisines section
    "profile.cuisines": "ประเภทอาหาร",
    "profile.all_cuisines": "ทุกประเภทอาหาร",
    "profile.cuisine_thai": "ไทย",
    "profile.cuisine_japanese": "ญี่ปุ่น",
    "profile.cuisine_korean": "เกาหลี",
    "profile.cuisine_italian": "อิตาเลียน",
    "profile.cuisine_mexican": "เม็กซิกัน",
    "profile.cuisine_indian": "อินเดีย",
    "profile.cuisine_chinese": "จีน",
    "profile.cuisine_american": "อเมริกัน",
    "profile.cuisine_french": "ฝรั่งเศส",
    "profile.cuisine_vietnamese": "เวียดนาม",
    "profile.cuisine_middle_eastern": "ตะวันออกกลาง",
    "profile.cuisine_street_food": "อาหารข้างทาง",

    // Profile — settings section
    "profile.settings": "การตั้งค่า",
    "profile.budget_level": "ระดับราคา",
    "profile.search_radius": "รัศมีการค้นหา",
    "profile.budget_budget": "ประหยัด",
    "profile.budget_moderate": "ปานกลาง",
    "profile.budget_upscale": "หรูหรา",
    "profile.budget_fine_dining": "ไฟน์ไดนิ่ง",
    "profile.distance_anywhere": "ทุกที่",

    // Profile — stats row
    "profile.stats_swipes": "สไวป์",
    "profile.stats_liked": "ถูกใจ",
    "profile.stats_saved": "บันทึก",
    "profile.stats_shared": "แชร์",

    // Profile — partner row
    "profile.partner": "คู่",
    "profile.partner_invite_hint": "เชิญหรือเพิ่มคู่",
    "profile.view": "ดู",
    "profile.invite": "เชิญ",
    "profile.add": "เพิ่ม",
    "profile.partner_shared": "{{count}} แชร์",

    // Profile — saved section
    "profile.saved": "บันทึกไว้",
    "profile.no_saved_restaurants": "ไม่มีร้านอาหารที่บันทึกไว้",
    "profile.saved_summary": "{{mine}} บันทึก · {{partner}} แชร์",
    "profile.no_saved_yet": "ยังไม่มีร้านอาหารที่บันทึก",
    "profile.save_hint": "แตะหัวใจที่ร้านอาหารเพื่อบันทึก",

    // Owner dashboard
    "owner.restaurant_setup": "ตั้งค่าร้านอาหาร",
    "owner.category": "ประเภท",
    "owner.tags": "แท็ก",
    "owner.address": "ที่อยู่",
    "owner.photos": "รูปภาพ",
    "owner.photos_desc": "จัดการรูปภาพร้านอาหาร",
    "owner.menus": "เมนู",
    "owner.menus_desc": "เพิ่มและจัดการเมนูอาหาร",
    "owner.add_menu_item": "เพิ่มรายการเมนู",
    "owner.add_photos_desc": "เพิ่มรูปภาพสูงสุด 10 รูปของร้าน อาหาร และบรรยากาศ",
    "owner.add_dishes_desc": "เพิ่มเมนูพร้อมรูปภาพและราคาเพื่อแสดงในการ์ดสไวป์",
    "owner.restaurant_name_placeholder": "ชื่อร้านอาหาร",
    "owner.address_placeholder": "เช่น 123 ถนนสุขุมวิท กรุงเทพฯ",
    "owner.search_category": "ค้นหาประเภท...",
    "owner.search_tags": "ค้นหาแท็ก...",
    "owner.no_matches": "ไม่พบผลลัพธ์",
    "owner.no_more_tags": "ไม่มีแท็กเพิ่มเติม",
    "owner.upload": "อัพโหลด",
    "owner.performance_snapshot": "ภาพรวมประสิทธิภาพ",
    "owner.todays_activity": "กิจกรรมวันนี้",
    "owner.quick_stats": "สถิติด่วน",
    "owner.conversion": "การแปลง",
    "owner.avg_time": "เวลาเฉลี่ย",
    "owner.returning": "กลับมา",
    "owner.engagement_funnel": "ช่องทางการมีส่วนร่วม",
    "owner.delivery_breakdown": "แบ่งตามแพลตฟอร์มส่งอาหาร",
    "owner.revenue_insights": "ข้อมูลรายได้",
    "owner.est_weekly": "รายได้สัปดาห์โดยประมาณ",
    "owner.proj_monthly": "คาดการณ์รายเดือน",
    "owner.avg_order": "ออเดอร์เฉลี่ย",
    "owner.growth": "การเติบโต",
    "owner.audience_demographics": "ข้อมูลประชากรผู้ชม",
    "owner.visitor_loyalty": "ความภักดีของผู้เข้าชม",
    "owner.category_rank": "อันดับในหมวดหมู่",
    "owner.restaurants": "ร้านอาหาร",
    "owner.user_interactions": "การโต้ตอบของผู้ใช้",
    "owner.full_analytics": "วิเคราะห์ครบถ้วน",
    "owner.full_analytics_desc": "ข้อมูลเชิงลึก, สถิติเมนู, และชั่วโมงพีค",
    "owner.tab_overview": "ภาพรวม",
    "owner.tab_menu_cards": "การ์ดเมนู",
    "owner.tab_peak_times": "ช่วงเวลาพีค",
    "owner.weekly_performance": "ประสิทธิภาพรายสัปดาห์",
    "owner.best_performing_day": "วันที่มีประสิทธิภาพสูงสุด",
    "owner.top_menu_swipe": "เมนูยอดนิยมตามประสิทธิภาพการสไวป์",
    "owner.menu_insight": "ข้อมูลเชิงลึก",
    "owner.peak_hours": "ชั่วโมงพีคการมีส่วนร่วม",
    "owner.weekly_heatmap": "ฮีตแมปรายสัปดาห์",
    "owner.timing_insight": "ข้อมูลเชิงลึกด้านเวลา",
    "owner.promote": "โปรโมทธุรกิจของคุณ",
    "owner.campaigns": "แคมเปญ",
    "owner.new_campaign": "แคมเปญใหม่",
    "owner.no_campaigns": "ยังไม่มีแคมเปญ",
    "owner.no_campaigns_desc": "สร้างแคมเปญแรกของคุณเพื่อดึงดูดผู้ทานด้วยดีลพิเศษ",
    "owner.active_badge": "กำลังใช้งาน",
    "owner.deactivate": "ปิดใช้งาน",
    "owner.activate_package": "เปิดใช้งานแพ็คเกจ",
    "owner.edit_campaign": "แก้ไขแคมเปญ",
    "owner.create_campaign_title": "สร้างแคมเปญ",
    "owner.campaign_name": "ชื่อแคมเปญ",
    "owner.deal_type": "ประเภทดีล",
    "owner.description": "คำอธิบาย",
    "owner.campaign_duration": "ระยะเวลาแคมเปญ",
    "owner.start_date": "วันเริ่มต้น",
    "owner.end_date": "วันสิ้นสุด",
    "owner.conditions": "เงื่อนไข",
    "owner.min_spend": "ยอดใช้จ่ายขั้นต่ำ (฿)",
    "owner.max_redemptions": "จำนวนใช้สูงสุด",
    "owner.target_audience": "กลุ่มเป้าหมาย",
    "owner.target_audience_desc": "เลือกกลุ่มลูกค้าเพื่อกำหนดเป้าหมายแคมเปญ",
    "owner.add_custom_group": "เพิ่มกลุ่มเอง...",
    "owner.preview": "ตัวอย่าง",
    "owner.preview_label": "ตัวอย่างสำหรับผู้ทาน",
    "owner.preview_hint": "นี่คือวิธีที่ผู้ทานจะเห็นแคมเปญของคุณ",
    "owner.what_you_get": "สิ่งที่คุณได้รับ",
    "owner.your_featured_dish": "เมนูที่คุณแนะนำ",
    "owner.save_changes": "บันทึกการเปลี่ยนแปลง",
    "owner.publish": "เผยแพร่",
    "owner.failed_analytics": "โหลดข้อมูลวิเคราะห์ไม่สำเร็จ",
    "owner.returning_label": "กลับมา",
    "owner.avg_visits": "{{count}} ครั้งเฉลี่ย",
    "owner.loyalty": "ความภักดี:",
    "owner.top_percentile": "อันดับ",
    "owner.percentile": "เปอร์เซ็นไทล์",
    "owner.of": "จาก",
    "owner.day_campaign": "แคมเปญ {{count}} วัน",
    "owner.low": "ต่ำ",
    "owner.high": "สูง",
    "owner.swipes": "สไวป์",
    "owner.liked": "ถูกใจ",
    "owner.like_rate": "อัตราถูกใจ",
    "owner.segment": "กลุ่ม",
    "owner.segments": "กลุ่ม",
    "owner.redemptions_max": "ครั้งสูงสุด",
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
