import { useLocation } from "wouter";
import { useRestaurants } from "@/hooks/use-restaurants";
import { LoadingMascot } from "@/components/LoadingMascot";
import { BottomNav } from "@/components/BottomNav";
import drunkToastImg from "@assets/drunk_toast_nobg.png";

const MOCK_RESTAURANTS_BY_MENU: Record<string, Array<{ id: number; name: string; category: string; rating: string; priceLevel: number; address: string; imageUrl: string; description: string; sponsored?: boolean }>> = {
  "Bars": [
    { id: 301, name: "Tep Bar", category: "🍸 Cocktail · Thai spirits", rating: "4.7", priceLevel: 3, address: "Charoen Krung", imageUrl: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&auto=format&fit=crop&q=60", description: "Thai heritage cocktails with live traditional music", sponsored: true },
    { id: 302, name: "Rabbit Hole", category: "🍸 Speakeasy · Cocktails", rating: "4.6", priceLevel: 3, address: "Thonglor 7", imageUrl: "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=600&auto=format&fit=crop&q=60", description: "Hidden speakeasy with craft cocktails and dim lighting" },
    { id: 303, name: "Sky Bar", category: "🌃 Rooftop · Views", rating: "4.5", priceLevel: 4, address: "Silom (Lebua)", imageUrl: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&auto=format&fit=crop&q=60", description: "Iconic rooftop bar from The Hangover II, stunning views" },
    { id: 304, name: "Havana Social", category: "🍹 Rum · Latin vibes", rating: "4.4", priceLevel: 3, address: "Sukhumvit 11", imageUrl: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=60", description: "Cuban-inspired rum bar behind a phone booth entrance" },
    { id: 305, name: "Iron Fairies", category: "🧚 Whimsical · Jazz", rating: "4.3", priceLevel: 3, address: "Thonglor 25", imageUrl: "https://images.unsplash.com/photo-1525268323446-0505b6fe7778?w=600&auto=format&fit=crop&q=60", description: "Fairy-tale themed bar with handmade iron fairies and live jazz" },
    { id: 306, name: "Tropic City", category: "🌴 Tiki · Tropical", rating: "4.6", priceLevel: 2, address: "Charoen Krung 28", imageUrl: "https://images.unsplash.com/photo-1536935338788-846bb9981813?w=600&auto=format&fit=crop&q=60", description: "Tropical tiki cocktails in a lush jungle setting" },
    { id: 307, name: "Teens of Thailand", category: "🫖 Gin · Tea", rating: "4.5", priceLevel: 2, address: "Soi Nana (Chinatown)", imageUrl: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&auto=format&fit=crop&q=60", description: "Cozy gin bar in Chinatown with tea-infused cocktails" },
  ],
  "Thai": [
    { id: 201, name: "Thipsamai", category: "🇹🇭 Thai · Street food", rating: "4.9", priceLevel: 1, address: "Maha Chai Rd", imageUrl: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600&auto=format&fit=crop&q=60", description: "Famous pad thai since 1966" },
    { id: 241, name: "Krua Apsorn", category: "🇹🇭 Thai · Curry", rating: "4.8", priceLevel: 1, address: "Samsen Rd", imageUrl: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&auto=format&fit=crop&q=60", description: "Royal recipe green curry, Michelin Bib" },
    { id: 244, name: "Jay Fai", category: "🇹🇭 Thai · Street food", rating: "4.9", priceLevel: 3, address: "Maha Chai Rd", imageUrl: "https://images.unsplash.com/photo-1569562211093-4ed0d0758f12?w=600&auto=format&fit=crop&q=60", description: "Michelin-starred street food legend" },
    { id: 271, name: "Somtum Der", category: "🇹🇭 Isaan · Salad", rating: "4.6", priceLevel: 2, address: "Sala Daeng", imageUrl: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&auto=format&fit=crop&q=60", description: "Michelin Bib Gourmand som tum" },
  ],
  "Sushi": [
    { id: 251, name: "Sushi Masato", category: "🇯🇵 Japanese · Omakase", rating: "4.9", priceLevel: 4, address: "Thonglor 13", imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&auto=format&fit=crop&q=60", description: "Intimate 8-seat counter, Tsukiji fish" },
    { id: 252, name: "Sushi Zo", category: "🇯🇵 Japanese · Omakase", rating: "4.7", priceLevel: 4, address: "Gaysorn", imageUrl: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&auto=format&fit=crop&q=60", description: "LA-born omakase in Bangkok" },
  ],
  "Pizza": [
    { id: 231, name: "Peppina", category: "🍕 Italian · Pizza", rating: "4.8", priceLevel: 3, address: "Sukhumvit 33", imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=60", description: "Neapolitan pizza with San Marzano tomatoes" },
    { id: 232, name: "Pizza Massilia", category: "🍕 Italian · Pizza", rating: "4.7", priceLevel: 3, address: "Ekkamai", imageUrl: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600&auto=format&fit=crop&q=60", description: "Wood-fired in a custom Italian oven" },
    { id: 233, name: "Il Fumo", category: "🍕 Italian · Pizza", rating: "4.5", priceLevel: 2, address: "Sathorn", imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&auto=format&fit=crop&q=60", description: "Smoked meats and classic Margherita" },
  ],
  "Coffee": [
    { id: 311, name: "Roots Coffee", category: "☕ Specialty · Third wave", rating: "4.7", priceLevel: 2, address: "CentralWorld", imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&auto=format&fit=crop&q=60", description: "Thai specialty coffee roasters" },
    { id: 312, name: "Factory Coffee", category: "☕ Cafe · Brunch", rating: "4.5", priceLevel: 2, address: "Phrom Phong", imageUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&auto=format&fit=crop&q=60", description: "Industrial-chic cafe with great pour-overs" },
    { id: 313, name: "Kaizen Coffee", category: "☕ Japanese · Pour over", rating: "4.6", priceLevel: 2, address: "Ekkamai", imageUrl: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=600&auto=format&fit=crop&q=60", description: "Japanese-style precision brewing" },
  ],
  "Burgers": [
    { id: 263, name: "Bun Meat & Cheese", category: "🍔 American · Burger", rating: "4.6", priceLevel: 2, address: "Ekkamai", imageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=60", description: "Double smash with aged cheddar", sponsored: true },
    { id: 261, name: "Daniel Thaiger", category: "🍔 American · Burger", rating: "4.5", priceLevel: 2, address: "Sukhumvit 36", imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=60", description: "Bangkok's OG food truck burger" },
    { id: 262, name: "Shake Shack", category: "🍔 American · Burger", rating: "4.3", priceLevel: 2, address: "CentralWorld", imageUrl: "https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=600&auto=format&fit=crop&q=60", description: "ShackBurger with crinkle-cut fries" },
  ],
  "Desserts": [
    { id: 321, name: "After You", category: "🍰 Dessert · Cafe", rating: "4.5", priceLevel: 2, address: "Thonglor", imageUrl: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&auto=format&fit=crop&q=60", description: "Famous Shibuya honey toast and kakigori" },
    { id: 322, name: "Creamery Boutique", category: "🍦 Ice cream · Artisan", rating: "4.6", priceLevel: 2, address: "Sukhumvit 49", imageUrl: "https://images.unsplash.com/photo-1488900128323-21503983a07e?w=600&auto=format&fit=crop&q=60", description: "Artisan small-batch ice cream flavors" },
    { id: 323, name: "Baan Kanom Thai", category: "🍡 Thai · Sweets", rating: "4.3", priceLevel: 1, address: "Old Town", imageUrl: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&auto=format&fit=crop&q=60", description: "Traditional Thai desserts and kanom" },
  ],
  "Pad Thai": [
    { id: 203, name: "Baan Pad Thai", category: "🇹🇭 Thai · Casual", rating: "4.5", priceLevel: 2, address: "Siam Sq Soi 5", imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=60", description: "Modern take on classic pad thai", sponsored: true },
    { id: 201, name: "Thipsamai", category: "🇹🇭 Thai · Street food", rating: "4.9", priceLevel: 1, address: "Maha Chai Rd", imageUrl: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600&auto=format&fit=crop&q=60", description: "Famous pad thai since 1966" },
    { id: 202, name: "Pad Thai Fai Ta Lu", category: "🇹🇭 Thai · Street food", rating: "4.7", priceLevel: 1, address: "Dinso Rd", imageUrl: "https://images.unsplash.com/photo-1569562211093-4ed0d0758f12?w=600&auto=format&fit=crop&q=60", description: "Fire-cooked pad thai with wok hei" },
    { id: 204, name: "Pad Thai Pratu Pi", category: "🇹🇭 Thai · Night market", rating: "4.6", priceLevel: 1, address: "Phra Athit Rd", imageUrl: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&auto=format&fit=crop&q=60", description: "Late-night pad thai spot near Khao San" },
  ],
  "Korean BBQ": [
    { id: 212, name: "Mongkol Korean", category: "🇰🇷 Korean · BBQ", rating: "4.6", priceLevel: 3, address: "Sukhumvit 24", imageUrl: "https://images.unsplash.com/photo-1583224964978-2257b960c3d3?w=600&auto=format&fit=crop&q=60", description: "Premium Korean cuts with banchan", sponsored: true },
    { id: 211, name: "Sukishi Korean BBQ", category: "🇰🇷 Korean · BBQ", rating: "4.4", priceLevel: 2, address: "CentralWorld", imageUrl: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&auto=format&fit=crop&q=60", description: "All-you-can-eat Korean BBQ buffet" },
    { id: 213, name: "Palsaik Samgyupsal", category: "🇰🇷 Korean · BBQ", rating: "4.5", priceLevel: 2, address: "Siam Paragon", imageUrl: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&auto=format&fit=crop&q=60", description: "8-color samgyeopsal specialist" },
  ],
  "Tonkotsu Ramen": [
    { id: 221, name: "Ippudo", category: "🇯🇵 Japanese · Ramen", rating: "4.6", priceLevel: 2, address: "CentralWorld", imageUrl: "https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=600&auto=format&fit=crop&q=60", description: "Hakata tonkotsu since 1985", sponsored: true },
    { id: 222, name: "Bankara Ramen", category: "🇯🇵 Japanese · Ramen", rating: "4.7", priceLevel: 2, address: "Thonglor", imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=60", description: "Rich 18-hour pork bone broth" },
    { id: 223, name: "Ramen Misoya", category: "🇯🇵 Japanese · Ramen", rating: "4.3", priceLevel: 2, address: "Silom", imageUrl: "https://images.unsplash.com/photo-1591814468924-caf88d1232e1?w=600&auto=format&fit=crop&q=60", description: "Miso-tonkotsu blend ramen" },
    { id: 224, name: "Noods Pork Noodles", category: "🍜 Noodle Bar · Pork", rating: "4.6", priceLevel: 1, address: "Ari", imageUrl: "https://images.unsplash.com/photo-1555126634-323283e090fa?w=600&auto=format&fit=crop&q=60", description: "Handmade pork noodles with slow-braised broth" },
  ],
  "Margherita Pizza": [
    { id: 231, name: "Peppina", category: "🍕 Italian · Pizza", rating: "4.8", priceLevel: 3, address: "Sukhumvit 33", imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=60", description: "Neapolitan pizza with San Marzano tomatoes" },
    { id: 232, name: "Pizza Massilia", category: "🍕 Italian · Pizza", rating: "4.7", priceLevel: 3, address: "Ekkamai", imageUrl: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600&auto=format&fit=crop&q=60", description: "Wood-fired in a custom Italian oven", sponsored: true },
    { id: 233, name: "Il Fumo", category: "🍕 Italian · Pizza", rating: "4.5", priceLevel: 2, address: "Sathorn", imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&auto=format&fit=crop&q=60", description: "Smoked meats and classic Margherita" },
  ],
  "Green Curry": [
    { id: 242, name: "Baan Ice", category: "🇹🇭 Thai · Home style", rating: "4.6", priceLevel: 2, address: "Soi Thonglor", imageUrl: "https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=600&auto=format&fit=crop&q=60", description: "Celebrity chef's signature curry", sponsored: true },
    { id: 241, name: "Krua Apsorn", category: "🇹🇭 Thai · Curry", rating: "4.8", priceLevel: 1, address: "Samsen Rd", imageUrl: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&auto=format&fit=crop&q=60", description: "Royal recipe green curry, Michelin Bib" },
    { id: 243, name: "Somtum Der", category: "🇹🇭 Thai · Isaan", rating: "4.5", priceLevel: 2, address: "Sala Daeng", imageUrl: "https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=600&auto=format&fit=crop&q=60", description: "Michelin-starred Thai classics" },
    { id: 244, name: "Jay Fai", category: "🇹🇭 Thai · Street food", rating: "4.9", priceLevel: 3, address: "Maha Chai Rd", imageUrl: "https://images.unsplash.com/photo-1569562211093-4ed0d0758f12?w=600&auto=format&fit=crop&q=60", description: "Michelin-starred street food legend" },
  ],
  "Sushi Omakase": [
    { id: 251, name: "Sushi Masato", category: "🇯🇵 Japanese · Omakase", rating: "4.9", priceLevel: 4, address: "Thonglor 13", imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&auto=format&fit=crop&q=60", description: "Intimate 8-seat counter, Tsukiji fish" },
    { id: 252, name: "Sushi Zo", category: "🇯🇵 Japanese · Omakase", rating: "4.7", priceLevel: 4, address: "Gaysorn", imageUrl: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&auto=format&fit=crop&q=60", description: "LA-born omakase in Bangkok", sponsored: true },
  ],
  "Smash Burger": [
    { id: 263, name: "Bun Meat & Cheese", category: "🍔 American · Burger", rating: "4.6", priceLevel: 2, address: "Ekkamai", imageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=60", description: "Double smash with aged cheddar", sponsored: true },
    { id: 261, name: "Daniel Thaiger", category: "🍔 American · Burger", rating: "4.5", priceLevel: 2, address: "Sukhumvit 36", imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=60", description: "Bangkok's OG food truck burger" },
    { id: 262, name: "Shake Shack", category: "🍔 American · Burger", rating: "4.3", priceLevel: 2, address: "CentralWorld", imageUrl: "https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=600&auto=format&fit=crop&q=60", description: "ShackBurger with crinkle-cut fries" },
  ],
  "Som Tum": [
    { id: 271, name: "Somtum Der", category: "🇹🇭 Isaan · Salad", rating: "4.6", priceLevel: 2, address: "Sala Daeng", imageUrl: "https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=600&auto=format&fit=crop&q=60", description: "Michelin Bib Gourmand som tum" },
    { id: 272, name: "Som Tum Nua", category: "🇹🇭 Isaan · Salad", rating: "4.5", priceLevel: 1, address: "Siam Square", imageUrl: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600&auto=format&fit=crop&q=60", description: "Classic som tum with fried chicken" },
  ],
  "Dim Sum": [
    { id: 282, name: "Din Tai Fung", category: "🇹🇼 Taiwanese · Dim sum", rating: "4.7", priceLevel: 3, address: "CentralWorld", imageUrl: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=600&auto=format&fit=crop&q=60", description: "World-famous xiao long bao", sponsored: true },
    { id: 281, name: "Hong Bao", category: "🇨🇳 Chinese · Dim sum", rating: "4.5", priceLevel: 2, address: "Chinatown", imageUrl: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&auto=format&fit=crop&q=60", description: "Authentic Cantonese dim sum" },
  ],
  "Tacos": [
    { id: 292, name: "Touche Hombre", category: "🇲🇽 Mexican · Modern", rating: "4.6", priceLevel: 3, address: "Thonglor", imageUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&auto=format&fit=crop&q=60", description: "Modern Mexican with mezcal bar", sponsored: true },
    { id: 291, name: "Barrio Bonito", category: "🇲🇽 Mexican · Tacos", rating: "4.4", priceLevel: 2, address: "Khao San", imageUrl: "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=600&auto=format&fit=crop&q=60", description: "Street-style tacos al pastor" },
  ],
  "Mango Sticky Rice": [
    { id: 331, name: "Mae Varee", category: "🇹🇭 Thai · Dessert", rating: "4.8", priceLevel: 1, address: "Thonglor BTS", imageUrl: "https://images.unsplash.com/photo-1609951651556-5334e2706168?w=600&auto=format&fit=crop&q=60", description: "Bangkok's most famous mango sticky rice stall", sponsored: true },
    { id: 332, name: "Kor Panich", category: "🇹🇭 Thai · Sweets", rating: "4.7", priceLevel: 1, address: "Tanao Rd", imageUrl: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&auto=format&fit=crop&q=60", description: "Century-old Thai dessert shop" },
    { id: 333, name: "Make Me Mango", category: "🥭 Thai · Dessert cafe", rating: "4.5", priceLevel: 2, address: "Siam Square", imageUrl: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&auto=format&fit=crop&q=60", description: "All-mango dessert cafe with creative twists" },
  ],
  "Tom Yum Goong": [
    { id: 341, name: "P'Aor Tom Yum", category: "🇹🇭 Thai · Soup", rating: "4.9", priceLevel: 2, address: "Phetchaburi Rd", imageUrl: "https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=600&auto=format&fit=crop&q=60", description: "Legendary creamy tom yum with river prawns", sponsored: true },
    { id: 342, name: "Krua Apsorn", category: "🇹🇭 Thai · Royal", rating: "4.8", priceLevel: 1, address: "Samsen Rd", imageUrl: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&auto=format&fit=crop&q=60", description: "Tom yum with crab meat, Michelin Bib" },
    { id: 343, name: "Baan Phadthai", category: "🇹🇭 Thai · Casual", rating: "4.5", priceLevel: 2, address: "Charoen Krung", imageUrl: "https://images.unsplash.com/photo-1569562211093-4ed0d0758f12?w=600&auto=format&fit=crop&q=60", description: "Riverside Thai with excellent tom yum" },
  ],
  "Khao Soi": [
    { id: 351, name: "Ongtong Khaosoi", category: "🇹🇭 Northern Thai · Noodle", rating: "4.7", priceLevel: 1, address: "Ekkamai", imageUrl: "https://images.unsplash.com/photo-1569562211093-4ed0d0758f12?w=600&auto=format&fit=crop&q=60", description: "Rich coconut curry noodles from Chiang Mai recipe", sponsored: true },
    { id: 352, name: "Khao Soi Nimman", category: "🇹🇭 Northern Thai · Noodle", rating: "4.5", priceLevel: 1, address: "Thonglor", imageUrl: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&auto=format&fit=crop&q=60", description: "Authentic northern curry noodle soup" },
  ],
  "Seafood Platter": [
    { id: 361, name: "Laem Charoen Seafood", category: "🦀 Thai · Seafood", rating: "4.7", priceLevel: 3, address: "Siam Paragon", imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=60", description: "Premium Thai seafood chain with river views", sponsored: true },
    { id: 362, name: "Sornthong Seafood", category: "🦐 Thai · Seafood", rating: "4.6", priceLevel: 2, address: "Charoen Krung", imageUrl: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600&auto=format&fit=crop&q=60", description: "Riverside seafood with stunning sunset views" },
    { id: 363, name: "T&K Seafood", category: "🦀 Chinese-Thai · Seafood", rating: "4.5", priceLevel: 2, address: "Chinatown", imageUrl: "https://images.unsplash.com/photo-1569562211093-4ed0d0758f12?w=600&auto=format&fit=crop&q=60", description: "Legendary Chinatown seafood with giant prawns" },
  ],
  "Chicken Biryani": [
    { id: 371, name: "Home Cuisine Islamic", category: "🇮🇳 Indian · Halal", rating: "4.6", priceLevel: 1, address: "Charoen Krung", imageUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=60", description: "Legendary halal biryani in Old Town", sponsored: true },
    { id: 372, name: "Nana Biryani", category: "🇮🇳 Indian · Halal", rating: "4.5", priceLevel: 1, address: "Sukhumvit Soi 3", imageUrl: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&auto=format&fit=crop&q=60", description: "Fragrant chicken biryani in Little Arabia" },
    { id: 373, name: "Gaggan Anand", category: "🇮🇳 Indian · Fine dining", rating: "4.9", priceLevel: 4, address: "Langsuan", imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&auto=format&fit=crop&q=60", description: "Progressive Indian cuisine, Asia's Best" },
  ],
  "Açaí Bowl": [
    { id: 381, name: "Broccoli Revolution", category: "🥗 Healthy · Vegan", rating: "4.5", priceLevel: 2, address: "Sukhumvit 49", imageUrl: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&auto=format&fit=crop&q=60", description: "Plant-based cafe with açaí bowls and smoothies", sponsored: true },
    { id: 382, name: "Veganerie", category: "🌿 Vegan · Cafe", rating: "4.4", priceLevel: 2, address: "Siam Paragon", imageUrl: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&auto=format&fit=crop&q=60", description: "All-vegan cafe with colorful bowls" },
  ],
  "Matcha Latte & Cake": [
    { id: 391, name: "Tsujiri", category: "🍵 Japanese · Matcha", rating: "4.6", priceLevel: 2, address: "Siam Paragon", imageUrl: "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=600&auto=format&fit=crop&q=60", description: "Kyoto matcha specialist since 1860", sponsored: true },
    { id: 392, name: "Nana's Green Tea", category: "🍵 Japanese · Cafe", rating: "4.4", priceLevel: 2, address: "CentralWorld", imageUrl: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&auto=format&fit=crop&q=60", description: "Modern matcha cafe with latte art" },
    { id: 393, name: "After You", category: "🍰 Dessert · Cafe", rating: "4.5", priceLevel: 2, address: "Thonglor", imageUrl: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&auto=format&fit=crop&q=60", description: "Matcha kakigori and honey toast" },
  ],
  "Pad Kra Pao": [
    { id: 401, name: "Jeh O Chula", category: "🇹🇭 Thai · Street food", rating: "4.8", priceLevel: 1, address: "Chula Soi 20", imageUrl: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&auto=format&fit=crop&q=60", description: "Famous late-night pad kra pao and mama tom yum", sponsored: true },
    { id: 402, name: "Phed Phed", category: "🇹🇭 Thai · Spicy", rating: "4.5", priceLevel: 1, address: "Ari", imageUrl: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600&auto=format&fit=crop&q=60", description: "Extra spicy holy basil stir-fry" },
    { id: 403, name: "Somsak Pu Ob", category: "🇹🇭 Thai · Street food", rating: "4.7", priceLevel: 1, address: "Charoen Krung", imageUrl: "https://images.unsplash.com/photo-1569562211093-4ed0d0758f12?w=600&auto=format&fit=crop&q=60", description: "Classic street-side pad kra pao with crispy egg" },
  ],
  "Eggs Benedict": [
    { id: 411, name: "Roast Coffee & Eatery", category: "🍳 Brunch · Western", rating: "4.7", priceLevel: 3, address: "Thonglor", imageUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop&q=60", description: "Bangkok's best eggs benny with hollandaise", sponsored: true },
    { id: 412, name: "Broccoli Revolution", category: "🥗 Healthy · Brunch", rating: "4.5", priceLevel: 2, address: "Sukhumvit 49", imageUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop&q=60", description: "Plant-based eggs benedict with cashew hollandaise" },
    { id: 413, name: "Clinton St. Baking Co.", category: "🇺🇸 American · Brunch", rating: "4.6", priceLevel: 3, address: "Phrom Phong", imageUrl: "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=600&auto=format&fit=crop&q=60", description: "NYC-imported brunch with fluffy pancakes" },
  ],
  "Pancakes & Waffles": [
    { id: 421, name: "Gram Cafe", category: "🇯🇵 Japanese · Cafe", rating: "4.6", priceLevel: 2, address: "Siam Paragon", imageUrl: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&auto=format&fit=crop&q=60", description: "Famous jiggly soufflé pancakes from Osaka", sponsored: true },
    { id: 422, name: "Pancake Cafe", category: "🥞 Brunch · Cafe", rating: "4.4", priceLevel: 2, address: "Ari", imageUrl: "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=600&auto=format&fit=crop&q=60", description: "All-day pancakes with creative toppings" },
    { id: 423, name: "Iwane Goes Nature", category: "🌿 Organic · Brunch", rating: "4.5", priceLevel: 2, address: "Ekkamai", imageUrl: "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=600&auto=format&fit=crop&q=60", description: "Garden cafe with organic waffles and smoothies" },
  ],
  "Smoothie Bowl": [
    { id: 431, name: "Broccoli Revolution", category: "🥗 Healthy · Vegan", rating: "4.5", priceLevel: 2, address: "Sukhumvit 49", imageUrl: "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=600&auto=format&fit=crop&q=60", description: "Rainbow smoothie bowls with superfoods", sponsored: true },
    { id: 432, name: "Veganerie", category: "🌿 Vegan · Cafe", rating: "4.4", priceLevel: 2, address: "Mercury Ville", imageUrl: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&auto=format&fit=crop&q=60", description: "Pitaya and açaí bowls with granola" },
    { id: 433, name: "The Smoothie Bar", category: "🥤 Juice · Healthy", rating: "4.3", priceLevel: 2, address: "Thonglor", imageUrl: "https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=600&auto=format&fit=crop&q=60", description: "Fresh pressed juices and superfood bowls" },
  ],
  "Croissant & Pastry": [
    { id: 441, name: "Holey Artisan Bakery", category: "🥐 French · Bakery", rating: "4.7", priceLevel: 3, address: "Sukhumvit 49", imageUrl: "https://images.unsplash.com/photo-1530610476181-d83430b64dcd?w=600&auto=format&fit=crop&q=60", description: "Award-winning croissants and sourdough", sponsored: true },
    { id: 442, name: "Tiong Bahru Bakery", category: "🥐 Artisan · Cafe", rating: "4.5", priceLevel: 3, address: "Siam Discovery", imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=60", description: "Singapore's famous bakery with flaky croissants" },
    { id: 443, name: "Karmakamet Diner", category: "🍰 Cafe · Artisan", rating: "4.6", priceLevel: 3, address: "Sukhumvit 51", imageUrl: "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=600&auto=format&fit=crop&q=60", description: "Fragrant pastries in a whimsical aromatherapy setting" },
  ],
  "Thai Milk Tea": [
    { id: 451, name: "ChaTraMue", category: "🧋 Thai · Tea shop", rating: "4.6", priceLevel: 1, address: "All over Bangkok", imageUrl: "https://images.unsplash.com/photo-1558857563-b371033873b8?w=600&auto=format&fit=crop&q=60", description: "Thailand's original hand-brewed Thai tea since 1945", sponsored: true },
    { id: 452, name: "Number One Brand", category: "🧋 Thai · Tea", rating: "4.4", priceLevel: 1, address: "Chatuchak", imageUrl: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=600&auto=format&fit=crop&q=60", description: "Classic roadside Thai tea with condensed milk" },
    { id: 453, name: "Cha Bar BKK", category: "🍵 Modern · Tea cafe", rating: "4.5", priceLevel: 2, address: "Thonglor", imageUrl: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&auto=format&fit=crop&q=60", description: "Artisan Thai tea with organic milk options" },
  ],
  "Bubble Tea": [
    { id: 461, name: "KOI Thé", category: "🧋 Taiwanese · Boba", rating: "4.5", priceLevel: 2, address: "Siam Paragon", imageUrl: "https://images.unsplash.com/photo-1541696490-8744a5dc0228?w=600&auto=format&fit=crop&q=60", description: "Golden bubble milk tea with hand-made tapioca", sponsored: true },
    { id: 462, name: "Tiger Sugar", category: "🧋 Taiwanese · Brown sugar", rating: "4.6", priceLevel: 2, address: "CentralWorld", imageUrl: "https://images.unsplash.com/photo-1558857563-b371033873b8?w=600&auto=format&fit=crop&q=60", description: "Viral brown sugar boba with dramatic stripes" },
    { id: 463, name: "Gong Cha", category: "🧋 Taiwanese · Tea", rating: "4.3", priceLevel: 1, address: "Siam Square", imageUrl: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=600&auto=format&fit=crop&q=60", description: "Classic milk tea with chewy taro balls" },
  ],
  "Khao Tom": [
    { id: 471, name: "Khao Tom Boworn", category: "🇹🇭 Thai · Late night", rating: "4.6", priceLevel: 1, address: "Boworn Niwet", imageUrl: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&auto=format&fit=crop&q=60", description: "Legendary late-night rice soup near the palace", sponsored: true },
    { id: 472, name: "Khao Tom Jay Suay", category: "🇹🇭 Thai · Rice soup", rating: "4.5", priceLevel: 1, address: "Yaowarat", imageUrl: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&auto=format&fit=crop&q=60", description: "Chinatown rice porridge with all the fixings" },
  ],
  "Ice Cream & Gelato": [
    { id: 481, name: "Creamery Boutique", category: "🍦 Artisan · Ice cream", rating: "4.6", priceLevel: 2, address: "Sukhumvit 49", imageUrl: "https://images.unsplash.com/photo-1488900128323-21503983a07e?w=600&auto=format&fit=crop&q=60", description: "Thai-inspired flavors like tom yum sorbet", sponsored: true },
    { id: 482, name: "Guss Damn Good", category: "🍦 Craft · Gelato", rating: "4.5", priceLevel: 2, address: "Thonglor", imageUrl: "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=600&auto=format&fit=crop&q=60", description: "Bold craft gelato with unusual Thai flavors" },
    { id: 483, name: "iberry", category: "🍨 Thai · Ice cream", rating: "4.4", priceLevel: 2, address: "Siam Square", imageUrl: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&auto=format&fit=crop&q=60", description: "Local favorite with mango sticky rice gelato" },
  ],
  "Breakfast": [
    { id: 411, name: "Roast Coffee & Eatery", category: "🍳 Brunch · Western", rating: "4.7", priceLevel: 3, address: "Thonglor", imageUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop&q=60", description: "Bangkok's best brunch with eggs benny", sponsored: true },
    { id: 413, name: "Clinton St. Baking Co.", category: "🇺🇸 American · Brunch", rating: "4.6", priceLevel: 3, address: "Phrom Phong", imageUrl: "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=600&auto=format&fit=crop&q=60", description: "NYC-imported brunch classics" },
    { id: 421, name: "Gram Cafe", category: "🇯🇵 Japanese · Cafe", rating: "4.6", priceLevel: 2, address: "Siam Paragon", imageUrl: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&auto=format&fit=crop&q=60", description: "Famous soufflé pancakes from Osaka" },
    { id: 423, name: "Iwane Goes Nature", category: "🌿 Organic · Brunch", rating: "4.5", priceLevel: 2, address: "Ekkamai", imageUrl: "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=600&auto=format&fit=crop&q=60", description: "Garden cafe with organic breakfast" },
  ],
  "Cafe": [
    { id: 311, name: "Roots Coffee", category: "☕ Specialty · Third wave", rating: "4.7", priceLevel: 2, address: "CentralWorld", imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&auto=format&fit=crop&q=60", description: "Thai specialty coffee from Chiang Mai highlands" },
    { id: 312, name: "Factory Coffee", category: "☕ Cafe · Brunch", rating: "4.5", priceLevel: 2, address: "Phrom Phong", imageUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&auto=format&fit=crop&q=60", description: "Industrial-chic cafe with pour-overs" },
    { id: 313, name: "Kaizen Coffee", category: "☕ Japanese · Pour over", rating: "4.6", priceLevel: 2, address: "Ekkamai", imageUrl: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=600&auto=format&fit=crop&q=60", description: "Japanese-style precision brewing" },
    { id: 441, name: "Holey Artisan Bakery", category: "🥐 French · Bakery", rating: "4.7", priceLevel: 3, address: "Sukhumvit 49", imageUrl: "https://images.unsplash.com/photo-1530610476181-d83430b64dcd?w=600&auto=format&fit=crop&q=60", description: "Award-winning croissants and coffee" },
  ],
};

export default function RestaurantList() {
  const [, navigate] = useLocation();
  const { data: apiRestaurants = [], isLoading } = useRestaurants();

  const params = new URLSearchParams(window.location.search);
  const category = params.get("category") || "Restaurants";
  const isBars = category === "Bars";

  const mockList = MOCK_RESTAURANTS_BY_MENU[category];
  const restaurants = mockList
    ? mockList.map((r) => ({ ...r, lat: "13.7466", lng: "100.5393", isNew: false, trendingScore: 80 }))
    : apiRestaurants;
  const loading = mockList ? false : isLoading;

  return (
    <div className="w-full min-h-[100dvh] bg-white" data-testid="restaurant-list-page">
      <div className="flex items-center gap-3 px-6 pt-14 pb-4 border-b border-gray-100/80">
        {isBars ? (
          <>
            <h1 className="text-[28px] font-bold tracking-tight">🍸 Bars</h1>
            <div className="flex-1 relative h-7">
              <img
                src={drunkToastImg}
                alt="Drunk Toast mascot"
                className="h-[72px] w-[72px] object-contain absolute animate-drunk-stumble gpu-accelerated drop-shadow-sm"
                style={{ bottom: -6 }}
                data-testid="img-drunk-toast"
              />
            </div>
            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">{restaurants.length} places</span>
          </>
        ) : (
          <>
            <h1 className="text-[28px] font-bold tracking-tight flex-1">{category}</h1>
            <span className="text-xs text-muted-foreground font-medium">{restaurants.length} places</span>
          </>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingMascot size="md" />
        </div>
      ) : (
        <div className="px-6 py-5 pb-24 space-y-4">
          {restaurants.map((r: any, idx: number) => (
            <div
              key={r.id}
              className={`flex gap-4 bg-white rounded-2xl cursor-pointer active:scale-[0.98] transition-transform p-1 relative ${isBars ? "animate-drunk-sway" : ""}`}
              style={{
                boxShadow: r.sponsored ? "0 2px 16px -3px rgba(234,179,8,0.15)" : "0 2px 12px -3px rgba(0,0,0,0.06)",
                ...(isBars ? { animationDelay: `${idx * -0.8}s` } : {}),
              }}
              onClick={() => navigate(`/restaurant/${r.id}`)}
              data-testid={`card-restaurant-${r.id}`}
            >
              {r.sponsored && (
                <div className="absolute -top-2 left-4 bg-amber-400 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1 z-10"
                  style={{ boxShadow: "0 2px 8px rgba(234,179,8,0.25)" }}
                >
                  <span className="text-[8px]">⭐</span> Sponsored
                </div>
              )}
              <div className="w-28 h-28 rounded-xl overflow-hidden flex-shrink-0 relative">
                <img src={r.imageUrl} alt={r.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0 py-2 pr-2">
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="font-bold text-base truncate">{r.name}</h3>
                  <div className="flex items-center gap-0.5 ml-2">
                    <span className="text-[10px]">★</span>
                    <span className="text-sm font-semibold">{r.rating}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{r.category}</p>
                <div className="flex items-center gap-2 mt-2.5 text-xs text-muted-foreground">
                  <span className="font-medium">{"฿".repeat(r.priceLevel)}</span>
                  <span>·</span>
                  <span>📍 {r.address}</span>
                </div>
                {r.description && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">{r.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
