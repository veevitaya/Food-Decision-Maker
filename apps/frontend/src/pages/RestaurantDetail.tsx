import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { RestaurantResponse } from "@shared/routes";
import type { Menu } from "@shared/schema";
import { LoadingMascot } from "@/components/LoadingMascot";
import { trackEvent } from "@/lib/analytics";
import { BottomNav } from "@/components/BottomNav";
import { SaveBucketPicker } from "@/components/SaveBucketPicker";
import { useSavedRestaurants } from "@/hooks/use-saved-restaurants";
import { RestaurantCampaignBanner } from "@/components/CampaignBanner";
import { PublicBannerSlot } from "@/components/PublicBannerSlot";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import noodsPhoto1 from "@assets/IMG_9279_1772025468067.jpeg";
import noodsPhoto2 from "@assets/IMG_9280_1772025468067.jpeg";
import noodsPhoto3 from "@assets/IMG_9281_1772025468067.jpeg";

const MOCK_PHOTOS = [
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=600&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&auto=format&fit=crop&q=60",
];

const RESTAURANT_PHOTOS: Record<number, string[]> = {
  224: [noodsPhoto1, noodsPhoto2, noodsPhoto3],
};

const MOCK_REVIEWS = [
  { author: "Nook P.", rating: 5, text: "Amazing food! The flavors were incredible and the service was top-notch. Will definitely come back! 🔥", timeAgo: "2 days ago", avatar: "👩" },
  { author: "Beam S.", rating: 4, text: "Really good portions and fair prices. The ambiance is great for group dinners. Highly recommend the specialty dish!", timeAgo: "1 week ago", avatar: "👨" },
  { author: "Ploy K.", rating: 5, text: "Best restaurant in the area! Everything was fresh and cooked perfectly. The staff was very friendly 😊", timeAgo: "2 weeks ago", avatar: "👧" },
  { author: "Art T.", rating: 4, text: "Solid food, nice atmosphere. A bit crowded on weekends but worth the wait.", timeAgo: "3 weeks ago", avatar: "🧑" },
];

const MOCK_HOURS = [
  { day: "Monday", hours: "11:00 - 22:00" },
  { day: "Tuesday", hours: "11:00 - 22:00" },
  { day: "Wednesday", hours: "11:00 - 22:00" },
  { day: "Thursday", hours: "11:00 - 23:00" },
  { day: "Friday", hours: "11:00 - 23:00" },
  { day: "Saturday", hours: "10:00 - 23:00" },
  { day: "Sunday", hours: "10:00 - 21:00" },
];

const MOCK_RESTAURANT_DB: Record<number, RestaurantResponse> = {
  201: { id: 201, name: "Thipsamai", description: "Famous pad thai since 1966. The original and still the best — wok-fried to perfection with tiger prawns wrapped in a golden egg net. A must-visit for any food lover in Bangkok.", imageUrl: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600&auto=format&fit=crop&q=60", lat: "13.7466", lng: "100.5047", category: "🇹🇭 Thai · Street food", priceLevel: 1, rating: "4.9", address: "Maha Chai Rd", isNew: false, trendingScore: 95 },
  202: { id: 202, name: "Pad Thai Fai Ta Lu", description: "Fire-cooked pad thai with intense wok hei flavor. Charcoal-fired woks create a uniquely smoky taste that sets this apart from every other pad thai in the city.", imageUrl: "https://images.unsplash.com/photo-1569562211093-4ed0d0758f12?w=600&auto=format&fit=crop&q=60", lat: "13.7560", lng: "100.5018", category: "🇹🇭 Thai · Street food", priceLevel: 1, rating: "4.7", address: "Dinso Rd", isNew: false, trendingScore: 88 },
  203: { id: 203, name: "Baan Pad Thai", description: "Modern take on classic pad thai in a stylish Siam Square setting. Uses premium rice noodles and a secret tamarind sauce recipe passed down three generations.", imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=60", lat: "13.7454", lng: "100.5340", category: "🇹🇭 Thai · Casual", priceLevel: 2, rating: "4.5", address: "Siam Sq Soi 5", isNew: true, trendingScore: 78 },
  204: { id: 204, name: "Pad Thai Pratu Pi", description: "Late-night pad thai spot near Khao San Road. A favorite among locals and late-night revelers, serving up perfectly balanced noodles until 2am.", imageUrl: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&auto=format&fit=crop&q=60", lat: "13.7589", lng: "100.4979", category: "🇹🇭 Thai · Night market", priceLevel: 1, rating: "4.6", address: "Phra Athit Rd", isNew: false, trendingScore: 82 },
  211: { id: 211, name: "Sukishi Korean BBQ", description: "All-you-can-eat Korean BBQ buffet with over 30 premium cuts of marinated meats. Features tabletop grills with excellent ventilation and unlimited banchan.", imageUrl: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&auto=format&fit=crop&q=60", lat: "13.7466", lng: "100.5393", category: "🇰🇷 Korean · BBQ", priceLevel: 2, rating: "4.4", address: "CentralWorld", isNew: false, trendingScore: 75 },
  212: { id: 212, name: "Mongkol Korean", description: "Premium Korean cuts with authentic banchan spread. Import their wagyu-grade beef directly from Korean farms for the most authentic KBBQ experience in Bangkok.", imageUrl: "https://images.unsplash.com/photo-1583224964978-2257b960c3d3?w=600&auto=format&fit=crop&q=60", lat: "13.7220", lng: "100.5690", category: "🇰🇷 Korean · BBQ", priceLevel: 3, rating: "4.6", address: "Sukhumvit 24", isNew: true, trendingScore: 85 },
  213: { id: 213, name: "Palsaik Samgyupsal", description: "8-color samgyeopsal specialist — each pork belly slice marinated in a different flavor from ginseng to curry. A unique Korean dining concept from Seoul.", imageUrl: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&auto=format&fit=crop&q=60", lat: "13.7466", lng: "100.5350", category: "🇰🇷 Korean · BBQ", priceLevel: 2, rating: "4.5", address: "Siam Paragon", isNew: false, trendingScore: 80 },
  221: { id: 221, name: "Ippudo", description: "Hakata tonkotsu ramen since 1985. Their signature Shiromaru Classic features a silky 18-hour pork bone broth with thin kaedama noodles.", imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=60", lat: "13.7466", lng: "100.5393", category: "🇯🇵 Japanese · Ramen", priceLevel: 2, rating: "4.6", address: "CentralWorld", isNew: false, trendingScore: 82 },
  222: { id: 222, name: "Bankara Ramen", description: "Rich 18-hour pork bone broth with a secret back-fat topping. The Kakuni (braised pork belly) is melt-in-your-mouth tender.", imageUrl: "https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=600&auto=format&fit=crop&q=60", lat: "13.7320", lng: "100.5783", category: "🇯🇵 Japanese · Ramen", priceLevel: 2, rating: "4.7", address: "Thonglor", isNew: false, trendingScore: 88 },
  223: { id: 223, name: "Ramen Misoya", description: "Miso-tonkotsu blend ramen with a unique depth of flavor. Three miso varieties from Hokkaido create a complex, umami-rich broth.", imageUrl: "https://images.unsplash.com/photo-1591814468924-caf88d1232e1?w=600&auto=format&fit=crop&q=60", lat: "13.7290", lng: "100.5352", category: "🇯🇵 Japanese · Ramen", priceLevel: 2, rating: "4.3", address: "Silom", isNew: false, trendingScore: 72 },
  224: { id: 224, name: "Noods Pork Noodles", description: "Beloved Ari noodle bar famous for its slow-braised pork bone broth simmered for over 12 hours. Handmade egg noodles are paired with tender braised pork leg, crispy pork belly, and house-made chili oil. A neighborhood favorite with a devoted following.", imageUrl: "https://images.unsplash.com/photo-1555126634-323283e090fa?w=600&auto=format&fit=crop&q=60", lat: "13.7790", lng: "100.5450", category: "🍜 Noodle Bar · Pork", priceLevel: 1, rating: "4.6", address: "Ari Soi 4, Phahonyothin", isNew: false, trendingScore: 87 },
  231: { id: 231, name: "Peppina", description: "Neapolitan pizza with San Marzano tomatoes and fior di latte mozzarella. Wood-fired at 485°C for exactly 90 seconds in a custom Stefano Ferrara oven.", imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=60", lat: "13.7320", lng: "100.5680", category: "🍕 Italian · Pizza", priceLevel: 3, rating: "4.8", address: "Sukhumvit 33", isNew: false, trendingScore: 90 },
  232: { id: 232, name: "Pizza Massilia", description: "Wood-fired in a custom Italian oven imported from Naples. Their truffle pizza with burrata is legendary among Bangkok's food community.", imageUrl: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600&auto=format&fit=crop&q=60", lat: "13.7225", lng: "100.5850", category: "🍕 Italian · Pizza", priceLevel: 3, rating: "4.7", address: "Ekkamai", isNew: true, trendingScore: 86 },
  233: { id: 233, name: "Il Fumo", description: "Smoked meats and classic Margherita in a chic Sathorn setting. Their signature smoked mozzarella pizza is unlike anything else in the city.", imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&auto=format&fit=crop&q=60", lat: "13.7230", lng: "100.5268", category: "🍕 Italian · Pizza", priceLevel: 2, rating: "4.5", address: "Sathorn", isNew: false, trendingScore: 78 },
  241: { id: 241, name: "Krua Apsorn", description: "Royal recipe green curry, awarded Michelin Bib Gourmand. The curry paste is hand-ground fresh daily using a century-old family recipe from the Thai royal court.", imageUrl: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&auto=format&fit=crop&q=60", lat: "13.7620", lng: "100.5100", category: "🇹🇭 Thai · Curry", priceLevel: 1, rating: "4.8", address: "Samsen Rd", isNew: false, trendingScore: 92 },
  242: { id: 242, name: "Baan Ice", description: "Celebrity chef's signature curry. Southern Thai–inspired green curry with incredible depth of flavor and locally sourced herbs.", imageUrl: "https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=600&auto=format&fit=crop&q=60", lat: "13.7320", lng: "100.5783", category: "🇹🇭 Thai · Home style", priceLevel: 2, rating: "4.6", address: "Soi Thonglor", isNew: false, trendingScore: 84 },
  243: { id: 243, name: "Somtum Der", description: "Michelin-starred Thai classics from Isaan. Their green curry uses a unique blend of fresh green chilies and sweet basil that delivers a perfect balance of heat.", imageUrl: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&auto=format&fit=crop&q=60", lat: "13.7290", lng: "100.5352", category: "🇹🇭 Thai · Isaan", priceLevel: 2, rating: "4.5", address: "Sala Daeng", isNew: false, trendingScore: 86 },
  244: { id: 244, name: "Jay Fai", description: "Michelin-starred street food legend. Bangkok's most famous street cook serves exquisite dishes from her wok, wearing signature ski goggles.", imageUrl: "https://images.unsplash.com/photo-1569562211093-4ed0d0758f12?w=600&auto=format&fit=crop&q=60", lat: "13.7560", lng: "100.5018", category: "🇹🇭 Thai · Street food", priceLevel: 3, rating: "4.9", address: "Maha Chai Rd", isNew: false, trendingScore: 98 },
  251: { id: 251, name: "Sushi Masato", description: "Intimate 8-seat counter with fish flown directly from Tsukiji market. Chef Masato's 20-course omakase is widely regarded as Bangkok's finest sushi experience.", imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&auto=format&fit=crop&q=60", lat: "13.7320", lng: "100.5783", category: "🇯🇵 Japanese · Omakase", priceLevel: 4, rating: "4.9", address: "Thonglor 13", isNew: false, trendingScore: 96 },
  252: { id: 252, name: "Sushi Zo", description: "LA-born omakase in Bangkok. Minimalist presentation lets the pristine quality of each piece shine through — no soy sauce needed.", imageUrl: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&auto=format&fit=crop&q=60", lat: "13.7466", lng: "100.5393", category: "🇯🇵 Japanese · Omakase", priceLevel: 4, rating: "4.7", address: "Gaysorn", isNew: true, trendingScore: 90 },
  261: { id: 261, name: "Daniel Thaiger", description: "Bangkok's OG food truck burger that started a street food revolution. Dry-aged Aussie beef, house-made brioche buns, and secret tiger sauce.", imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=60", lat: "13.7320", lng: "100.5680", category: "🍔 American · Burger", priceLevel: 2, rating: "4.5", address: "Sukhumvit 36", isNew: false, trendingScore: 85 },
  262: { id: 262, name: "Shake Shack", description: "ShackBurger with crinkle-cut fries and frozen custard. The Bangkok outpost brings the full NYC experience to CentralWorld.", imageUrl: "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=600&auto=format&fit=crop&q=60", lat: "13.7466", lng: "100.5393", category: "🍔 American · Burger", priceLevel: 2, rating: "4.3", address: "CentralWorld", isNew: false, trendingScore: 78 },
  263: { id: 263, name: "Bun Meat & Cheese", description: "Double smash patty with aged cheddar on a toasted potato bun. Their truffle fries are worth the trip alone.", imageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=60", lat: "13.7225", lng: "100.5850", category: "🍔 American · Burger", priceLevel: 2, rating: "4.6", address: "Ekkamai", isNew: true, trendingScore: 82 },
  271: { id: 271, name: "Somtum Der", description: "Michelin Bib Gourmand som tum. Fresh green papaya hand-pounded to order with fermented crab and a perfect balance of lime and palm sugar.", imageUrl: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&auto=format&fit=crop&q=60", lat: "13.7290", lng: "100.5352", category: "🇹🇭 Isaan · Salad", priceLevel: 2, rating: "4.6", address: "Sala Daeng", isNew: false, trendingScore: 88 },
  272: { id: 272, name: "Som Tum Nua", description: "Classic som tum paired with legendary fried chicken. Always a long queue at Siam Square but worth every minute of the wait.", imageUrl: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&auto=format&fit=crop&q=60", lat: "13.7454", lng: "100.5340", category: "🇹🇭 Isaan · Salad", priceLevel: 1, rating: "4.5", address: "Siam Square", isNew: false, trendingScore: 84 },
  281: { id: 281, name: "Hong Bao", description: "Authentic Cantonese dim sum in the heart of Chinatown. Their har gow and siu mai are made fresh throughout the morning by veteran dim sum chefs.", imageUrl: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&auto=format&fit=crop&q=60", lat: "13.7410", lng: "100.5100", category: "🇨🇳 Chinese · Dim sum", priceLevel: 2, rating: "4.5", address: "Chinatown", isNew: false, trendingScore: 80 },
  282: { id: 282, name: "Din Tai Fung", description: "World-famous xiao long bao with exactly 18 folds per dumpling. The CentralWorld branch features an open kitchen so you can watch the masters at work.", imageUrl: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=600&auto=format&fit=crop&q=60", lat: "13.7466", lng: "100.5393", category: "🇹🇼 Taiwanese · Dim sum", priceLevel: 3, rating: "4.7", address: "CentralWorld", isNew: false, trendingScore: 88 },
  291: { id: 291, name: "Barrio Bonito", description: "Street-style tacos al pastor and fresh guacamole near Khao San. Imported dried chilies and handmade corn tortillas bring authentic Mexican flavor.", imageUrl: "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=600&auto=format&fit=crop&q=60", lat: "13.7589", lng: "100.4979", category: "🇲🇽 Mexican · Tacos", priceLevel: 2, rating: "4.4", address: "Khao San", isNew: false, trendingScore: 76 },
  292: { id: 292, name: "Touche Hombre", description: "Modern Mexican with a craft mezcal bar. Their short rib tacos with mole negro and hand-pressed blue corn tortillas are a culinary experience.", imageUrl: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600&auto=format&fit=crop&q=60", lat: "13.7320", lng: "100.5783", category: "🇲🇽 Mexican · Modern", priceLevel: 3, rating: "4.6", address: "Thonglor", isNew: true, trendingScore: 84 },
  301: { id: 301, name: "Tep Bar", description: "Thai heritage cocktails paired with live traditional music in a beautifully restored Charoen Krung shophouse. Their lemongrass-infused ya dong shots are legendary.", imageUrl: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&auto=format&fit=crop&q=60", lat: "13.7280", lng: "100.5130", category: "🍸 Cocktail · Thai spirits", priceLevel: 3, rating: "4.7", address: "Charoen Krung", isNew: false, trendingScore: 92 },
  302: { id: 302, name: "Rabbit Hole", description: "Hidden speakeasy tucked behind an unmarked door in Thonglor. Their bartenders craft bespoke cocktails based on your mood — just tell them how you feel.", imageUrl: "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=600&auto=format&fit=crop&q=60", lat: "13.7320", lng: "100.5783", category: "🍸 Speakeasy · Cocktails", priceLevel: 3, rating: "4.6", address: "Thonglor 7", isNew: false, trendingScore: 88 },
  303: { id: 303, name: "Sky Bar", description: "Iconic open-air rooftop bar on the 63rd floor of Lebua Hotel. Made famous by The Hangover Part II, offering jaw-dropping 360° views of the Bangkok skyline.", imageUrl: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&auto=format&fit=crop&q=60", lat: "13.7220", lng: "100.5147", category: "🌃 Rooftop · Views", priceLevel: 4, rating: "4.5", address: "Silom (Lebua)", isNew: false, trendingScore: 94 },
  304: { id: 304, name: "Havana Social", description: "Step through the vintage phone booth entrance into a Cuban rum paradise. Live Latin music, over 200 rums, and hand-rolled cigars in a dimly lit 1950s Havana atmosphere.", imageUrl: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=60", lat: "13.7382", lng: "100.5609", category: "🍹 Rum · Latin vibes", priceLevel: 3, rating: "4.4", address: "Sukhumvit 11", isNew: false, trendingScore: 85 },
  305: { id: 305, name: "Iron Fairies", description: "Fairy-tale themed bar where thousands of handmade iron fairies line the walls. Live jazz every night in a space that feels like stepping into a storybook forest.", imageUrl: "https://images.unsplash.com/photo-1525268323446-0505b6fe7778?w=600&auto=format&fit=crop&q=60", lat: "13.7320", lng: "100.5783", category: "🧚 Whimsical · Jazz", priceLevel: 3, rating: "4.3", address: "Thonglor 25", isNew: false, trendingScore: 82 },
  306: { id: 306, name: "Tropic City", description: "Tropical tiki cocktails in a lush jungle setting dripping with plants and neon. Their rum punch bowls for sharing are the perfect way to start a Bangkok night out.", imageUrl: "https://images.unsplash.com/photo-1536935338788-846bb9981813?w=600&auto=format&fit=crop&q=60", lat: "13.7280", lng: "100.5130", category: "🌴 Tiki · Tropical", priceLevel: 2, rating: "4.6", address: "Charoen Krung 28", isNew: true, trendingScore: 87 },
  307: { id: 307, name: "Teens of Thailand", description: "Cozy gin bar in Chinatown serving tea-infused cocktails and house-made tonics. Small, intimate, and one of Asia's 50 Best Bars — arrive early to get a seat.", imageUrl: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&auto=format&fit=crop&q=60", lat: "13.7410", lng: "100.5100", category: "🫖 Gin · Tea", priceLevel: 2, rating: "4.5", address: "Soi Nana (Chinatown)", isNew: false, trendingScore: 90 },
  311: { id: 311, name: "Roots Coffee", description: "Thai specialty coffee roasters sourcing single-origin beans from Chiang Mai and Chiang Rai highlands. Their cold brew is smooth and chocolatey.", imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&auto=format&fit=crop&q=60", lat: "13.7466", lng: "100.5393", category: "☕ Specialty · Third wave", priceLevel: 2, rating: "4.7", address: "CentralWorld", isNew: false, trendingScore: 82 },
  312: { id: 312, name: "Factory Coffee", description: "Industrial-chic cafe with exposed brick and steel beams. Known for precise pour-overs and a brunch menu featuring Thai-inspired eggs benedict.", imageUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&auto=format&fit=crop&q=60", lat: "13.7310", lng: "100.5690", category: "☕ Cafe · Brunch", priceLevel: 2, rating: "4.5", address: "Phrom Phong", isNew: false, trendingScore: 78 },
  313: { id: 313, name: "Kaizen Coffee", description: "Japanese-style precision brewing in a minimalist Ekkamai space. Each cup is carefully hand-poured using V60 method for maximum clarity of flavor.", imageUrl: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=600&auto=format&fit=crop&q=60", lat: "13.7225", lng: "100.5850", category: "☕ Japanese · Pour over", priceLevel: 2, rating: "4.6", address: "Ekkamai", isNew: false, trendingScore: 80 },
  321: { id: 321, name: "After You", description: "Famous Shibuya honey toast and kakigori shaved ice. Their signature toast is a towering creation of crispy bread, ice cream, and drizzled honey.", imageUrl: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&auto=format&fit=crop&q=60", lat: "13.7320", lng: "100.5783", category: "🍰 Dessert · Cafe", priceLevel: 2, rating: "4.5", address: "Thonglor", isNew: false, trendingScore: 84 },
  322: { id: 322, name: "Creamery Boutique", description: "Artisan small-batch ice cream with unique Thai-inspired flavors like tom yum sorbet, Thai tea, and mango sticky rice. Each batch made fresh daily.", imageUrl: "https://images.unsplash.com/photo-1488900128323-21503983a07e?w=600&auto=format&fit=crop&q=60", lat: "13.7310", lng: "100.5690", category: "🍦 Ice cream · Artisan", priceLevel: 2, rating: "4.6", address: "Sukhumvit 49", isNew: true, trendingScore: 80 },
  323: { id: 323, name: "Baan Kanom Thai", description: "Traditional Thai desserts and kanom in a charming heritage house. Try the khanom chan (layered pandan cake) and tub tim krob (water chestnuts in coconut).", imageUrl: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&auto=format&fit=crop&q=60", lat: "13.7560", lng: "100.5018", category: "🍡 Thai · Sweets", priceLevel: 1, rating: "4.3", address: "Old Town", isNew: false, trendingScore: 76 },
  411: { id: 411, name: "Roast Coffee & Eatery", description: "Bangkok's premier brunch destination. Their eggs benedict with house-smoked salmon and silky hollandaise on brioche is worth the weekend wait. Great specialty coffee too.", imageUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop&q=60", lat: "13.7320", lng: "100.5783", category: "🍳 Brunch · Western", priceLevel: 3, rating: "4.7", address: "Thonglor", isNew: false, trendingScore: 88 },
  412: { id: 412, name: "Broccoli Revolution", description: "Plant-based brunch haven. Their cashew hollandaise eggs benedict and rainbow smoothie bowls prove that vegan food can be indulgent. Beautiful garden patio seating.", imageUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop&q=60", lat: "13.7310", lng: "100.5690", category: "🥗 Healthy · Brunch", priceLevel: 2, rating: "4.5", address: "Sukhumvit 49", isNew: false, trendingScore: 82 },
  413: { id: 413, name: "Clinton St. Baking Co.", description: "NYC's legendary bakery-restaurant imported to Bangkok. Their buttermilk pancakes with warm maple butter are consistently voted the city's best. Weekend brunch queues are real.", imageUrl: "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=600&auto=format&fit=crop&q=60", lat: "13.7310", lng: "100.5690", category: "🇺🇸 American · Brunch", priceLevel: 3, rating: "4.6", address: "Phrom Phong", isNew: false, trendingScore: 85 },
  421: { id: 421, name: "Gram Cafe", description: "Osaka's famous soufflé pancakes finally in Bangkok. These impossibly fluffy, jiggly pancakes are made fresh to order — limited to 20 servings per session. Worth the wait.", imageUrl: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&auto=format&fit=crop&q=60", lat: "13.7466", lng: "100.5350", category: "🇯🇵 Japanese · Cafe", priceLevel: 2, rating: "4.6", address: "Siam Paragon", isNew: true, trendingScore: 84 },
  422: { id: 422, name: "Pancake Cafe", description: "All-day pancakes with creative toppings from matcha cream to Thai tea butterscotch. Their ricotta hotcakes are fluffy, light, and generously portioned. Cozy Ari neighborhood vibes.", imageUrl: "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=600&auto=format&fit=crop&q=60", lat: "13.7720", lng: "100.5450", category: "🥞 Brunch · Cafe", priceLevel: 2, rating: "4.4", address: "Ari", isNew: false, trendingScore: 78 },
  423: { id: 423, name: "Iwane Goes Nature", description: "A hidden garden cafe in the heart of Ekkamai. Organic ingredients sourced from their own farm. Belgian waffles with fresh berries and homemade granola are standouts.", imageUrl: "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=600&auto=format&fit=crop&q=60", lat: "13.7225", lng: "100.5850", category: "🌿 Organic · Brunch", priceLevel: 2, rating: "4.5", address: "Ekkamai", isNew: false, trendingScore: 80 },
  431: { id: 431, name: "Broccoli Revolution", description: "Their smoothie bowls are art on a plate — vibrant pitaya, açaí, and blue spirulina bases topped with fresh tropical fruits, house granola, and edible flowers.", imageUrl: "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=600&auto=format&fit=crop&q=60", lat: "13.7310", lng: "100.5690", category: "🥗 Healthy · Vegan", priceLevel: 2, rating: "4.5", address: "Sukhumvit 49", isNew: false, trendingScore: 80 },
  432: { id: 432, name: "Veganerie", description: "Colorful vegan smoothie bowls packed with superfoods. Their pitaya bowl with coconut flakes and chia seeds is Instagram-famous. Multiple locations across Bangkok.", imageUrl: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&auto=format&fit=crop&q=60", lat: "13.7454", lng: "100.5340", category: "🌿 Vegan · Cafe", priceLevel: 2, rating: "4.4", address: "Mercury Ville", isNew: false, trendingScore: 76 },
  433: { id: 433, name: "The Smoothie Bar", description: "Fresh pressed juices and superfood smoothie bowls in a bright, minimalist space. Their green detox bowl with spirulina, banana, and almond butter is a local favorite.", imageUrl: "https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=600&auto=format&fit=crop&q=60", lat: "13.7320", lng: "100.5783", category: "🥤 Juice · Healthy", priceLevel: 2, rating: "4.3", address: "Thonglor", isNew: true, trendingScore: 74 },
  441: { id: 441, name: "Holey Artisan Bakery", description: "Award-winning French-style bakery with perfectly laminated croissants and crusty sourdough. Their almond croissant is flaky, buttery perfection. Great espresso to pair.", imageUrl: "https://images.unsplash.com/photo-1530610476181-d83430b64dcd?w=600&auto=format&fit=crop&q=60", lat: "13.7310", lng: "100.5690", category: "🥐 French · Bakery", priceLevel: 3, rating: "4.7", address: "Sukhumvit 49", isNew: false, trendingScore: 86 },
  442: { id: 442, name: "Tiong Bahru Bakery", description: "Singapore's celebrated artisan bakery. Their kouign-amann is caramelized heaven, and the croissants rival those in Paris. Beautiful airy cafe space inside Siam Discovery.", imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=60", lat: "13.7454", lng: "100.5340", category: "🥐 Artisan · Cafe", priceLevel: 3, rating: "4.5", address: "Siam Discovery", isNew: false, trendingScore: 82 },
  443: { id: 443, name: "Karmakamet Diner", description: "A whimsical cafe where aromatherapy meets gastronomy. Fragrant pastries, lavender scones, and rose-infused treats in a dreamlike setting filled with apothecary bottles.", imageUrl: "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=600&auto=format&fit=crop&q=60", lat: "13.7310", lng: "100.5690", category: "🍰 Cafe · Artisan", priceLevel: 3, rating: "4.6", address: "Sukhumvit 51", isNew: false, trendingScore: 84 },
  451: { id: 451, name: "ChaTraMue", description: "Thailand's most beloved tea brand since 1945. Their signature orange Thai iced tea is brewed fresh with a secret blend of Ceylon tea and star anise. Iconic red cup.", imageUrl: "https://images.unsplash.com/photo-1558857563-b371033873b8?w=600&auto=format&fit=crop&q=60", lat: "13.7466", lng: "100.5393", category: "🧋 Thai · Tea shop", priceLevel: 1, rating: "4.6", address: "All over Bangkok", isNew: false, trendingScore: 82 },
  452: { id: 452, name: "Number One Brand", description: "Classic roadside Thai tea stall where condensed milk swirls into strong brewed Ceylon. Their iced Thai tea served in a plastic bag with a straw is peak Bangkok street culture.", imageUrl: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=600&auto=format&fit=crop&q=60", lat: "13.7560", lng: "100.5018", category: "🧋 Thai · Tea", priceLevel: 1, rating: "4.4", address: "Chatuchak", isNew: false, trendingScore: 75 },
  453: { id: 453, name: "Cha Bar BKK", description: "Modern Thai tea cafe elevating the classic cha yen with organic milk options and artisan sweeteners. Their Thai tea affogato is an inspired fusion of Thai and Italian.", imageUrl: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&auto=format&fit=crop&q=60", lat: "13.7320", lng: "100.5783", category: "🍵 Modern · Tea cafe", priceLevel: 2, rating: "4.5", address: "Thonglor", isNew: true, trendingScore: 78 },
  461: { id: 461, name: "KOI Thé", description: "Taiwan's famous golden bubble milk tea in Bangkok. Their signature golden boba pearls are hand-made daily and have the perfect chewy texture. The macchiato foam top is silky smooth.", imageUrl: "https://images.unsplash.com/photo-1541696490-8744a5dc0228?w=600&auto=format&fit=crop&q=60", lat: "13.7466", lng: "100.5350", category: "🧋 Taiwanese · Boba", priceLevel: 2, rating: "4.5", address: "Siam Paragon", isNew: false, trendingScore: 80 },
  462: { id: 462, name: "Tiger Sugar", description: "The viral brown sugar boba brand from Taiwan. Their dramatic tiger-stripe pattern of caramelized brown sugar dripping down the cup is as photogenic as it is delicious.", imageUrl: "https://images.unsplash.com/photo-1558857563-b371033873b8?w=600&auto=format&fit=crop&q=60", lat: "13.7466", lng: "100.5393", category: "🧋 Taiwanese · Brown sugar", priceLevel: 2, rating: "4.6", address: "CentralWorld", isNew: true, trendingScore: 85 },
  463: { id: 463, name: "Gong Cha", description: "Classic Taiwanese milk tea chain with reliable quality. Their taro milk tea with chewy taro balls is a comfort drink staple. Customizable sweetness and ice levels.", imageUrl: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=600&auto=format&fit=crop&q=60", lat: "13.7454", lng: "100.5340", category: "🧋 Taiwanese · Tea", priceLevel: 1, rating: "4.3", address: "Siam Square", isNew: false, trendingScore: 74 },
  471: { id: 471, name: "Khao Tom Boworn", description: "The go-to late-night rice soup spot near the Grand Palace. Comfort food at its finest — silky rice porridge with minced pork, egg, and ginger. Open until 3am.", imageUrl: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&auto=format&fit=crop&q=60", lat: "13.7560", lng: "100.5018", category: "🇹🇭 Thai · Late night", priceLevel: 1, rating: "4.6", address: "Boworn Niwet", isNew: false, trendingScore: 82 },
  472: { id: 472, name: "Khao Tom Jay Suay", description: "Chinatown's beloved rice porridge stall. A bowl of their jok (congee) with century egg and crispy fried dough sticks is the perfect late-night or early-morning meal.", imageUrl: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&auto=format&fit=crop&q=60", lat: "13.7410", lng: "100.5100", category: "🇹🇭 Thai · Rice soup", priceLevel: 1, rating: "4.5", address: "Yaowarat", isNew: false, trendingScore: 78 },
  481: { id: 481, name: "Creamery Boutique", description: "Artisan small-batch ice cream with creative Thai flavors — tom yum sorbet, Thai tea, lemongrass coconut. Each batch made fresh daily with premium local ingredients.", imageUrl: "https://images.unsplash.com/photo-1488900128323-21503983a07e?w=600&auto=format&fit=crop&q=60", lat: "13.7310", lng: "100.5690", category: "🍦 Artisan · Ice cream", priceLevel: 2, rating: "4.6", address: "Sukhumvit 49", isNew: true, trendingScore: 80 },
  482: { id: 482, name: "Guss Damn Good", description: "Bold, creative gelato with unusual Thai-inspired flavors like salted egg yolk, pandan coconut, and chili chocolate. Their shop in Thonglor has a fun, irreverent vibe.", imageUrl: "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=600&auto=format&fit=crop&q=60", lat: "13.7320", lng: "100.5783", category: "🍦 Craft · Gelato", priceLevel: 2, rating: "4.5", address: "Thonglor", isNew: false, trendingScore: 78 },
  483: { id: 483, name: "iberry", description: "Beloved Thai ice cream chain with unique local flavors. Their mango sticky rice ice cream captures the essence of Thailand's favorite dessert in frozen form.", imageUrl: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&auto=format&fit=crop&q=60", lat: "13.7454", lng: "100.5340", category: "🍨 Thai · Ice cream", priceLevel: 2, rating: "4.4", address: "Siam Square", isNew: false, trendingScore: 76 },
  331: { id: 331, name: "Mae Varee", description: "Bangkok's most famous mango sticky rice stall, right at Thonglor BTS exit. Their perfectly ripe Nam Dok Mai mangoes paired with warm coconut-cream sticky rice is the gold standard. Long queues but worth every minute.", imageUrl: "https://images.unsplash.com/photo-1609951651556-5334e2706168?w=600&auto=format&fit=crop&q=60", lat: "13.7320", lng: "100.5783", category: "🇹🇭 Thai · Dessert", priceLevel: 1, rating: "4.8", address: "Thonglor BTS", isNew: false, trendingScore: 90 },
  332: { id: 332, name: "Kor Panich", description: "Century-old Thai dessert institution serving the city's finest khanom krok (coconut pancakes) and traditional Thai sweets since 1932. A living piece of Bangkok culinary history.", imageUrl: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&auto=format&fit=crop&q=60", lat: "13.7560", lng: "100.5018", category: "🇹🇭 Thai · Sweets", priceLevel: 1, rating: "4.7", address: "Tanao Rd", isNew: false, trendingScore: 85 },
  333: { id: 333, name: "Make Me Mango", description: "All-mango dessert cafe with creative twists on Thailand's favorite fruit. Their mango sticky rice parfait and mango cheesecake are Instagram favorites. Bright, cheerful space.", imageUrl: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&auto=format&fit=crop&q=60", lat: "13.7454", lng: "100.5340", category: "🥭 Thai · Dessert cafe", priceLevel: 2, rating: "4.5", address: "Siam Square", isNew: true, trendingScore: 78 },
  341: { id: 341, name: "P'Aor Tom Yum", description: "Legendary creamy tom yum goong with massive river prawns. The rich, spicy broth has a cult following — people queue for over an hour. The ultimate Bangkok street food experience.", imageUrl: "https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=600&auto=format&fit=crop&q=60", lat: "13.7500", lng: "100.5400", category: "🇹🇭 Thai · Soup", priceLevel: 2, rating: "4.9", address: "Phetchaburi Rd", isNew: false, trendingScore: 95 },
  342: { id: 342, name: "Krua Apsorn", description: "Tom yum with fresh crab meat in a rich, aromatic broth. This Michelin Bib Gourmand winner uses a royal recipe passed down through generations of Thai cooks.", imageUrl: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&auto=format&fit=crop&q=60", lat: "13.7620", lng: "100.5100", category: "🇹🇭 Thai · Royal", priceLevel: 1, rating: "4.8", address: "Samsen Rd", isNew: false, trendingScore: 92 },
  343: { id: 343, name: "Baan Phadthai", description: "Charming riverside Thai restaurant with an excellent tom yum alongside their famous pad thai. Beautiful Chao Phraya views and warm hospitality make this a special occasion spot.", imageUrl: "https://images.unsplash.com/photo-1569562211093-4ed0d0758f12?w=600&auto=format&fit=crop&q=60", lat: "13.7280", lng: "100.5130", category: "🇹🇭 Thai · Casual", priceLevel: 2, rating: "4.5", address: "Charoen Krung", isNew: false, trendingScore: 80 },
  351: { id: 351, name: "Ongtong Khaosoi", description: "Rich coconut curry noodles from an authentic Chiang Mai family recipe. The curry paste is made fresh daily with over 15 spices. Topped with crispy fried noodles and pickled mustard greens.", imageUrl: "https://images.unsplash.com/photo-1569562211093-4ed0d0758f12?w=600&auto=format&fit=crop&q=60", lat: "13.7225", lng: "100.5850", category: "🇹🇭 Northern Thai · Noodle", priceLevel: 1, rating: "4.7", address: "Ekkamai", isNew: false, trendingScore: 86 },
  352: { id: 352, name: "Khao Soi Nimman", description: "Authentic northern Thai curry noodle soup with tender braised chicken leg. The rich, slightly sweet coconut curry broth is balanced with sharp pickled cabbage and shallots.", imageUrl: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&auto=format&fit=crop&q=60", lat: "13.7320", lng: "100.5783", category: "🇹🇭 Northern Thai · Noodle", priceLevel: 1, rating: "4.5", address: "Thonglor", isNew: false, trendingScore: 78 },
  361: { id: 361, name: "Laem Charoen Seafood", description: "Premium Thai seafood chain known for their signature steamed sea bass with lime and their massive seafood platters. Fresh catches daily with stunning river views at select locations.", imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=60", lat: "13.7454", lng: "100.5340", category: "🦀 Thai · Seafood", priceLevel: 3, rating: "4.7", address: "Siam Paragon", isNew: false, trendingScore: 88 },
  362: { id: 362, name: "Sornthong Seafood", description: "Riverside seafood restaurant with stunning Chao Phraya sunset views. Their grilled river prawns and steamed crab with glass noodles are standout dishes. Perfect for special occasions.", imageUrl: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600&auto=format&fit=crop&q=60", lat: "13.7280", lng: "100.5130", category: "🦐 Thai · Seafood", priceLevel: 2, rating: "4.6", address: "Charoen Krung", isNew: false, trendingScore: 82 },
  363: { id: 363, name: "T&K Seafood", description: "Legendary Chinatown seafood restaurant with giant river prawns grilled over charcoal. Their tom yum goong and garlic pepper crab are favorites among locals and tourists alike.", imageUrl: "https://images.unsplash.com/photo-1569562211093-4ed0d0758f12?w=600&auto=format&fit=crop&q=60", lat: "13.7410", lng: "100.5100", category: "🦀 Chinese-Thai · Seafood", priceLevel: 2, rating: "4.5", address: "Chinatown", isNew: false, trendingScore: 85 },
  371: { id: 371, name: "Home Cuisine Islamic", description: "Legendary halal biryani in Bangkok's Old Town. Their chicken biryani uses a family recipe with saffron-infused basmati rice and tender spiced chicken. A cultural landmark since 1950.", imageUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=60", lat: "13.7280", lng: "100.5130", category: "🇮🇳 Indian · Halal", priceLevel: 1, rating: "4.6", address: "Charoen Krung", isNew: false, trendingScore: 82 },
  372: { id: 372, name: "Nana Biryani", description: "Fragrant chicken biryani in Bangkok's Little Arabia. Each plate of saffron rice is layered with tender spiced chicken and served with raita. Open late for the after-mosque crowd.", imageUrl: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&auto=format&fit=crop&q=60", lat: "13.7466", lng: "100.5393", category: "🇮🇳 Indian · Halal", priceLevel: 1, rating: "4.5", address: "Sukhumvit Soi 3", isNew: false, trendingScore: 78 },
  373: { id: 373, name: "Gaggan Anand", description: "Progressive Indian cuisine by the legendary Chef Gaggan. Named Asia's Best Restaurant multiple times, this boundary-pushing 25-course tasting menu redefines Indian gastronomy.", imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&auto=format&fit=crop&q=60", lat: "13.7310", lng: "100.5690", category: "🇮🇳 Indian · Fine dining", priceLevel: 4, rating: "4.9", address: "Langsuan", isNew: false, trendingScore: 98 },
  381: { id: 381, name: "Broccoli Revolution", description: "Plant-based cafe with colorful açaí bowls, avocado toasts, and superfood smoothies. Their pitaya bowl topped with fresh dragon fruit and granola is a visual masterpiece.", imageUrl: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&auto=format&fit=crop&q=60", lat: "13.7310", lng: "100.5690", category: "🥗 Healthy · Vegan", priceLevel: 2, rating: "4.5", address: "Sukhumvit 49", isNew: false, trendingScore: 80 },
  382: { id: 382, name: "Veganerie", description: "All-vegan cafe chain with Instagram-worthy açaí and smoothie bowls. Their signature rainbow bowl layers pitaya, mango, and spirulina for a burst of color and nutrition.", imageUrl: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&auto=format&fit=crop&q=60", lat: "13.7454", lng: "100.5340", category: "🌿 Vegan · Cafe", priceLevel: 2, rating: "4.4", address: "Siam Paragon", isNew: false, trendingScore: 76 },
  391: { id: 391, name: "Tsujiri", description: "Kyoto's premier matcha house, established in 1860. Their ceremonial-grade matcha lattes and matcha soft serve use stone-ground Uji green tea. The matcha tiramisu is exceptional.", imageUrl: "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=600&auto=format&fit=crop&q=60", lat: "13.7454", lng: "100.5340", category: "🍵 Japanese · Matcha", priceLevel: 2, rating: "4.6", address: "Siam Paragon", isNew: false, trendingScore: 82 },
  392: { id: 392, name: "Nana's Green Tea", description: "Modern Japanese matcha cafe with beautiful latte art and a menu of matcha-infused desserts. Their matcha parfait layers green tea ice cream, mochi, and azuki beans.", imageUrl: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&auto=format&fit=crop&q=60", lat: "13.7466", lng: "100.5393", category: "🍵 Japanese · Cafe", priceLevel: 2, rating: "4.4", address: "CentralWorld", isNew: false, trendingScore: 76 },
  393: { id: 393, name: "After You", description: "Bangkok's beloved dessert cafe known for matcha kakigori (shaved ice) and honey toast. Their matcha lava cake oozes with rich green tea ganache. Always a queue, always worth it.", imageUrl: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&auto=format&fit=crop&q=60", lat: "13.7320", lng: "100.5783", category: "🍰 Dessert · Cafe", priceLevel: 2, rating: "4.5", address: "Thonglor", isNew: false, trendingScore: 84 },
  401: { id: 401, name: "Jeh O Chula", description: "Famous late-night street food stall near Chula university. Their pad kra pao with crispy fried egg and mama noodle tom yum draw massive midnight crowds. Open from 9pm to 3am.", imageUrl: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&auto=format&fit=crop&q=60", lat: "13.7350", lng: "100.5300", category: "🇹🇭 Thai · Street food", priceLevel: 1, rating: "4.8", address: "Chula Soi 20", isNew: false, trendingScore: 92 },
  402: { id: 402, name: "Phed Phed", description: "Extra spicy holy basil stir-fry shop in Ari. Their pad kra pao uses a fiery blend of bird's eye chilies and fresh holy basil that sets the dish ablaze. Not for the faint-hearted.", imageUrl: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600&auto=format&fit=crop&q=60", lat: "13.7720", lng: "100.5450", category: "🇹🇭 Thai · Spicy", priceLevel: 1, rating: "4.5", address: "Ari", isNew: false, trendingScore: 78 },
  403: { id: 403, name: "Somsak Pu Ob", description: "Classic street-side pad kra pao with an impossibly crispy fried egg on top. The holy basil is always fresh, the wok hei is intense, and the portion is generous. A Charoen Krung staple.", imageUrl: "https://images.unsplash.com/photo-1569562211093-4ed0d0758f12?w=600&auto=format&fit=crop&q=60", lat: "13.7280", lng: "100.5130", category: "🇹🇭 Thai · Street food", priceLevel: 1, rating: "4.7", address: "Charoen Krung", isNew: false, trendingScore: 84 },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={`text-xs ${star <= rating ? "text-foreground" : "text-gray-200"}`}>
          ★
        </span>
      ))}
    </div>
  );
}

export default function RestaurantDetail() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/restaurant/:id");
  const id = params?.id ? parseInt(params.id) : null;
  const searchParams = new URLSearchParams(window.location.search);
  const recommendationSource = searchParams.get("recSource") ?? "unknown";
  const recommendationVariant = searchParams.get("recVariant") ?? "unknown";
  const recommendationExperimentKey = searchParams.get("recExp") ?? "unknown";
  const [activePhoto, setActivePhoto] = useState(0);
  const [showHours, setShowHours] = useState(false);
  const [showSavePicker, setShowSavePicker] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showDeliveryDrawer, setShowDeliveryDrawer] = useState(false);
  const { isSaved, getBucket } = useSavedRestaurants();
  const { isEnabled } = useFeatureFlags();
  const goBack = useCallback(() => {
    if (window.history.length > 1) window.history.back();
    else navigate("/");
  }, [navigate]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef(0);

  useEffect(() => {
    if (id) trackEvent("view_detail", { restaurantId: id });
  }, [id]);

  const mockRestaurant = id ? MOCK_RESTAURANT_DB[id] : undefined;

  const { data: apiRestaurant, isLoading, isError } = useQuery<RestaurantResponse>({
    queryKey: ["/api/restaurants", id],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!id && !mockRestaurant,
    retry: false,
  });

  const { data: menuItems = [] } = useQuery<Menu[]>({
    queryKey: ["/api/restaurants", id, "menus"],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${id}/menus`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (!menuItems.length || !id) return;
    for (const item of menuItems.filter((m) => m.isActive)) {
      trackEvent("view_menu_item", { restaurantId: id, menuItemId: item.id, metadata: { name: item.name } });
    }
  }, [menuItems, id]);

  const restaurant = mockRestaurant || apiRestaurant;

  if (!mockRestaurant && isLoading) {
    return (
      <div className="w-full h-[100dvh] flex items-center justify-center bg-white">
        <LoadingMascot size="lg" />
      </div>
    );
  }

  if (!restaurant || isError) {
    return (
      <div className="w-full h-[100dvh] flex flex-col items-center justify-center bg-white gap-4">
        <span className="text-4xl">😕</span>
        <p className="text-muted-foreground">Restaurant not found</p>
        <button
          onClick={goBack}
          className="px-6 py-3 rounded-full bg-foreground text-white font-bold text-sm active:scale-[0.95] transition-transform duration-200"
        >
          Go back
        </button>
      </div>
    );
  }

  const customPhotos = RESTAURANT_PHOTOS[restaurant.id];
  const extraApiPhotos = restaurant.photos?.filter((photo) => photo && photo !== restaurant.imageUrl) ?? [];
  const allPhotos = customPhotos
    ? [customPhotos[0], ...customPhotos.slice(1)]
    : [restaurant.imageUrl, ...extraApiPhotos, ...MOCK_PHOTOS].filter(Boolean);
  const openingHours = restaurant.openingHours?.length ? restaurant.openingHours : MOCK_HOURS;
  const reviews = restaurant.reviews?.length
    ? restaurant.reviews.map((review) => ({
        ...review,
        avatar: review.author.charAt(0).toUpperCase() || "•",
      }))
    : MOCK_REVIEWS;
  const phone = restaurant.phone || "+66 2-XXX-XXXX";

  const DELIVERY_APPS = [
    { id: "grab", name: "Grab", emoji: "🟢", color: "#00B14F", deepLink: (name: string) => `grab://food/search?q=${encodeURIComponent(name)}`, fallback: (name: string) => `https://food.grab.com/th/en/restaurants?search=${encodeURIComponent(name)}` },
    { id: "lineman", name: "LINE MAN", emoji: "🟩", color: "#00C300", deepLink: (name: string) => `lineman://food/search?q=${encodeURIComponent(name)}`, fallback: (name: string) => `https://lineman.line.me/restaurant/search?q=${encodeURIComponent(name)}` },
    { id: "robinhood", name: "Robinhood", emoji: "🟣", color: "#6C2BD9", deepLink: (name: string) => `robinhood://food/search?q=${encodeURIComponent(name)}`, fallback: (name: string) => `https://robfrnd.app/food?search=${encodeURIComponent(name)}` },
  ];

  const handleDeliverySelect = (platform: typeof DELIVERY_APPS[0]) => {
    trackEvent("delivery_click", {
      restaurantId: restaurant.id,
      metadata: {
        platform: platform.id,
        restaurantName: restaurant.name,
        recommendation_source: recommendationSource,
        recommendation_variant: recommendationVariant,
        recommendation_experiment_key: recommendationExperimentKey,
      },
    });

    const deepLink = platform.deepLink(restaurant.name);
    const fallback = platform.fallback(restaurant.name);

    const newWindow = window.open("", "_blank");

    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = deepLink;
    document.body.appendChild(iframe);

    setTimeout(() => {
      document.body.removeChild(iframe);
      if (newWindow && !newWindow.closed) {
        newWindow.location.href = fallback;
      }
    }, 1500);

    setShowDeliveryDrawer(false);
  };

  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todayHours = openingHours.find((h) => h.day === today);

  return (
    <div className="w-full min-h-[100dvh] bg-white pb-40" data-testid="restaurant-detail-page">
      <div className="relative w-full h-72 overflow-hidden">
        <div
          ref={scrollRef}
          className="flex w-full h-full overflow-x-auto snap-x snap-mandatory hide-scrollbar"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
          onScroll={() => {
            if (scrollRef.current) {
              const scrollLeft = scrollRef.current.scrollLeft;
              const width = scrollRef.current.clientWidth;
              const idx = Math.round(scrollLeft / width);
              if (idx !== activePhoto) setActivePhoto(idx);
            }
          }}
        >
          {allPhotos.map((photo, idx) => (
            <div key={idx} className="w-full h-full flex-shrink-0 snap-center">
              <img
                src={photo}
                alt={`${restaurant.name} ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10 pointer-events-none" />

        <button
          onClick={goBack}
          className="absolute top-4 left-4 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center z-10 active:scale-[0.90] transition-transform duration-150"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
          data-testid="button-back-hero"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>

        <div className="absolute top-4 right-4 flex items-center gap-2.5 z-10">
          <div className="bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1">
            <span className="text-white text-[10px] font-semibold">{activePhoto + 1}/{allPhotos.length}</span>
          </div>

          <button
            onClick={async () => {
              const url = window.location.href;
              if (navigator.share) {
                try {
                  await navigator.share({ title: restaurant.name, url });
                } catch {}
              } else {
                await navigator.clipboard.writeText(url);
              }
            }}
            className="w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-sm active:scale-[0.85] transition-transform duration-150"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
            data-testid="button-share"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
          </button>

          <button
            ref={saveButtonRef}
            onClick={() => setShowSavePicker(true)}
            className="w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-sm active:scale-[0.85] transition-transform duration-150"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
            data-testid="button-save"
          >
            <span className={restaurant && isSaved(restaurant.id) ? "inline-block" : ""}>
              {restaurant && isSaved(restaurant.id)
                ? (getBucket(restaurant.id) === "partner" ? "💕" : "❤️")
                : "🤍"}
            </span>
          </button>
        </div>

        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 pointer-events-none z-10">
          {allPhotos.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${idx === activePhoto ? "bg-white w-5" : "bg-white/50 w-1.5"}`}
            />
          ))}
        </div>
      </div>

      <div className="px-6 pt-5">
        <div className="flex items-start justify-between mb-1">
          <h1 className="text-2xl font-bold" data-testid="text-restaurant-name">{restaurant.name}</h1>
          <div className="flex items-center gap-1 bg-white border border-gray-100 px-3 py-1.5 rounded-full" style={{ boxShadow: "var(--shadow-sm)" }}>
            <span className="text-xs">★</span>
            <span className="font-bold text-sm">{restaurant.rating}</span>
          </div>
        </div>

        <p className="text-muted-foreground text-sm mb-3">{restaurant.category}</p>

        <div className="flex items-center gap-4 mb-5 text-sm text-muted-foreground">
          <span>📍 {restaurant.address}</span>
          <span>{"฿".repeat(restaurant.priceLevel)}</span>
        </div>

        <div className="mb-6" data-testid="text-description">
          <p className={`text-sm leading-relaxed text-foreground/80 ${!showFullDescription ? "line-clamp-3" : ""}`}>
            {restaurant.description}
          </p>
          {restaurant.description && restaurant.description.length > 120 && !showFullDescription && (
            <button
              onClick={() => setShowFullDescription(true)}
              className="text-sm font-semibold text-foreground mt-1 underline underline-offset-2"
              data-testid="button-show-more"
            >
              Show more
            </button>
          )}
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-4 hide-scrollbar -mx-6 px-6">
          {allPhotos.slice(1).map((photo, idx) => (
            <div
              key={idx}
              onClick={() => setActivePhoto(idx + 1)}
              className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer active:scale-[0.95] transition-transform duration-200"
              data-testid={`photo-thumb-${idx}`}
            >
              <img src={photo} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>

        <RestaurantCampaignBanner restaurantId={restaurant.id} />
        <PublicBannerSlot position="detail_bottom" className="mb-6" />

        <div className="border-t border-gray-100/80 pt-5 mb-5">
          <button
            onClick={() => setShowHours(!showHours)}
            className="w-full flex items-center justify-between py-2"
            data-testid="button-toggle-hours"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">🕐</span>
              <div className="text-left">
                <p className="font-bold text-sm">Opening Hours</p>
                <p className="text-xs text-green-600 font-medium">
                  Open now · {todayHours?.hours || "11:00 - 22:00"}
                </p>
              </div>
            </div>
            <span className={`text-muted-foreground text-xs transition-transform duration-300 inline-block ${showHours ? "rotate-180" : ""}`}>
              ▼
            </span>
          </button>

          <AnimatePresence>
            {showHours && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                transition={{ type: "spring", damping: 26, stiffness: 260, mass: 0.8 }}
                className="overflow-hidden"
              >
                <div className="py-2 space-y-2">
                  {openingHours.map((h) => (
                    <div key={h.day} className={`flex justify-between text-sm px-9 ${h.day === today ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                      <span>{h.day}</span>
                      <span>{h.hours}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-3 py-3 border-t border-gray-100/80 mb-5">
          <span className="text-lg">📞</span>
          <div>
            <p className="font-bold text-sm">Phone</p>
            <p className="text-sm text-muted-foreground">{phone}</p>
          </div>
        </div>

        {menuItems.filter((m) => m.isActive).length > 0 && (
          <div className="border-t border-gray-100/80 pt-5 mb-6">
            <h2 className="font-bold text-lg mb-4">Menu</h2>
            <div className="space-y-3">
              {menuItems.filter((m) => m.isActive).map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    trackEvent("click_menu_item", { restaurantId: restaurant.id, menuItemId: item.id, metadata: { name: item.name } });
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 text-left transition-colors"
                >
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{item.name}</p>
                    {item.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.description}</p>}
                    {item.priceApprox && <p className="text-xs font-medium text-foreground/70 mt-1">~฿{item.priceApprox}</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-gray-100/80 pt-5 mb-6">
          <h2 className="font-bold text-lg mb-4">Reviews</h2>
          <div className="space-y-5">
            {reviews.map((review, idx) => (
              <div
                key={idx}
                className="flex gap-3"
                data-testid={`review-${idx}`}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-50 to-yellow-50 flex items-center justify-center text-lg flex-shrink-0">
                  {review.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{review.author}</span>
                    <span className="text-xs text-muted-foreground">{review.timeAgo}</span>
                  </div>
                  <StarRating rating={review.rating} />
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{review.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100/80 pt-5 mb-6">
          <h2 className="font-bold text-lg mb-3">Location</h2>
          <div className="w-full h-40 rounded-2xl overflow-hidden border border-gray-100">
            <iframe
              title="Restaurant location"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(restaurant.lng) - 0.005}%2C${Number(restaurant.lat) - 0.003}%2C${Number(restaurant.lng) + 0.005}%2C${Number(restaurant.lat) + 0.003}&layer=mapnik&marker=${restaurant.lat}%2C${restaurant.lng}`}
              loading="lazy"
              className="w-full h-full border-0"
              style={{ filter: "saturate(0.9) contrast(0.92) brightness(1.05)" }}
            />
          </div>
        </div>
      </div>

      <div className="fixed left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100/80 px-6 py-3 z-50 flex gap-3" style={{ bottom: "calc(52px + max(env(safe-area-inset-bottom, 0px), 16px))" }}>
        {isEnabled("delivery_links") && (
          <button
            onClick={() => setShowDeliveryDrawer(true)}
            data-testid="button-order-delivery"
            className="flex-1 py-3.5 rounded-full bg-foreground text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform duration-200"
            style={{ boxShadow: "0 4px 15px -3px rgba(0,0,0,0.2)" }}
          >
            🛵 Order Delivery
          </button>
        )}
        <button
          onClick={() => {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${restaurant.lat},${restaurant.lng}`;
            window.open(url, "_blank");
          }}
          data-testid="button-directions"
          className="py-3.5 px-6 rounded-full bg-gray-100 font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform duration-200"
        >
          🗺️ Go
        </button>
      </div>

      <AnimatePresence>
        {showDeliveryDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/30 z-[60]"
              onClick={() => setShowDeliveryDrawer(false)}
              data-testid="delivery-drawer-overlay"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed left-0 right-0 bottom-0 z-[61] bg-white rounded-t-3xl px-6 pt-5 pb-8"
              style={{ boxShadow: "0 -8px 30px rgba(0,0,0,0.12)" }}
              data-testid="delivery-drawer"
            >
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
              <p className="text-base font-bold text-foreground mb-1">Order Delivery</p>
              <p className="text-xs text-muted-foreground mb-5">Choose your preferred delivery app</p>
              <div className="space-y-2.5">
                {DELIVERY_APPS.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => handleDeliverySelect(app)}
                    data-testid={`button-delivery-${app.id}`}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-gray-100 active:scale-[0.98] transition-all duration-150 hover:bg-gray-50"
                  >
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: `${app.color}15` }}>
                      {app.emoji}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-bold text-foreground">{app.name}</p>
                      <p className="text-[11px] text-muted-foreground">Open in {app.name} app</p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/40"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <BottomNav />

      {restaurant && (
        <SaveBucketPicker
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          open={showSavePicker}
          onClose={() => setShowSavePicker(false)}
          anchorRef={saveButtonRef}
        />
      )}
    </div>
  );
}
