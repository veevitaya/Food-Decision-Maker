# Toast - Food Decision Making App

A Tinder-style food discovery app that helps users decide what to eat, solo or with friends.

## Architecture
- **Frontend**: React + Vite + TailwindCSS + Framer Motion
- **Backend**: Express.js + PostgreSQL (Drizzle ORM)
- **Routing**: wouter (frontend), Express (backend)
- **State**: TanStack React Query
- **LINE Integration**: @line/liff SDK for LIFF (LINE Front-end Framework)

## Key Features
- **Home Screen**: Map background (OpenStreetMap, Bangkok), draggable bottom sheet with modes, animated emoji filters, horizontally scrollable restaurant rows
- **Solo Journey**: 3-step quiz (mood/cuisine, location/budget, interests) → 2-option results with animated mascot → restaurant list → restaurant detail
- **Group Journey**: Setup (map + location/budget/diet/LINE invite) → Waiting room (nudge button for LINE) → Synchronized swiping (Yum!/Nah stamps) → Match celebration with confetti
- **Restaurant Detail**: Photos carousel, reviews, opening hours, location map, "Order on Grab" deep link, directions button
- **Swipe Mode**: Tinder-style card swiping — menu cards for general modes (trending, budget, etc.) and restaurant cards for saved/partner/fancy/spicy/healthy modes with match celebration + confetti
- **Taste Profile**: `useTasteProfile` hook tracks swipe behavior (likes/dislikes/superlikes) in localStorage (`toast_taste_profile`). Powers personalized "Because you like..." section on home screen with dynamic title based on most-liked food categories
- **Session Bar**: Floating multi-session status bar with horizontal scrolling, persisted via sessionStorage
- **User Profile**: Editable profile page with dietary restrictions, cuisine preferences, default budget/distance, partner linking/unlinking, swipe stats, LINE login/logout
- **LINE LIFF Integration**: Login via LINE, share invites via LINE's share target picker, partner linking via LINE profiles. Falls back to LINE URL scheme when not in LIFF context
- **Invite Button**: Green LINE button on SwipePage header sends invite to friends via LINE messaging

## Pages
- `/` - Home (map + bottom sheet)
- `/solo/quiz` - Solo quiz flow
- `/solo/results` - Solo results (2 options with mascot)
- `/restaurants` - Restaurant list (filterable, clickable cards)
- `/restaurant/:id` - Restaurant detail page
- `/group/setup` - Group session setup (with map)
- `/group/waiting` - Waiting room (with nudge)
- `/group/swipe` - Group swiping (Yum!/Nah)
- `/swipe` - Solo swipe mode
- `/profile` - User profile & settings

## API Routes
- `GET /api/restaurants` - List restaurants (optional mode filter)
- `GET /api/restaurants/suggestions` - Get suggestions
- `GET /api/restaurants/:id` - Get single restaurant by ID
- `POST /api/preferences` - Record swipe preference
- `GET /api/profile/:lineUserId` - Get user profile
- `POST /api/profile` - Create/update user profile (upsert)
- `PATCH /api/profile/:lineUserId` - Partial update user profile

## Data Model
- `restaurants` table: name, description, imageUrl, lat/lng, category, priceLevel, rating, address, isNew, trendingScore
- `user_preferences` table: userId, restaurantId, preference (like/dislike/saved)
- `user_profiles` table: lineUserId (unique), displayName, pictureUrl, statusMessage, dietaryRestrictions (text[]), cuisinePreferences (text[]), defaultBudget, defaultDistance, partnerLineUserId, partnerDisplayName, partnerPictureUrl

## Environment Variables
- `VITE_LIFF_ID` - LINE LIFF ID (required for LINE login/share features, app works without it using fallback URL schemes)
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Express session secret

## Design System (Airbnb-Inspired)
- **Brand**: #FFCC02 golden yellow, text on brand: #2d2000
- **Background**: hsl(30, 20%, 97%) — warm cream
- **Cards**: Pure white with ultra-soft layered shadows
- **Borders**: Subtle gray-200/80 with hover→gray-300 transitions
- **Active states**: Dark foreground fill (bg-foreground text-white) instead of colored borders
- **Buttons**: Rounded-full with CSS active:scale-[0.95-0.97] transitions (no framer-motion whileTap)
- **Icons**: Static emoji compositions (no bouncy/floating/wiggle animations)
- **Shadows**: Layered system (--shadow-sm, --shadow-card, --shadow-elevated)
- **Transitions**: Spring-based (damping: 26, stiffness: 260, mass: 0.8) on structural motion (drawer, modals, page transitions). All interactive elements use CSS transition-transform duration-150 instead of framer-motion. No stagger delays, no tween/ease animations.
- **Typography**: Plus Jakarta Sans extrabold headings, Inter body, uppercase tracking-wider section labels
- **Toast logo**: @assets/toast_logo_nobg.png (always kept in DOM via display:inline/none toggle for instant rendering, marginBottom: -6px)
- **Toast mascot**: @assets/image_1772011321697.png (animated in SoloResults with float/tilt/sparkle)
- **Solo/Group icons**: Static multi-element emoji compositions (no movement animations)
- **LINE brand color**: #06C755 (used for LINE buttons and badges)
- **Stats card**: Dark navy (hsl(222,47%,16%) → hsl(222,47%,11%)) — NOT brown
- **Profile page**: Centered avatar layout, gold gradient avatar bg, "PROFILE" uppercase label, spacious card grid below header
- **Home profile button**: Golden gradient circle (bottom-right of drawer), static with CSS active:scale press feedback
- **BottomNav**: 3-tab bar (Explore/Swipe/Profile) with lucide-react icons (Search/Flame/User) + labels. Active tab uses brand color (#FFCC02), no dot indicator. Inactive tabs are gray-400. Route detection: `/` or `/restaurants` or `/restaurant/*`→Explore, `/swipe|/solo|/group`→Swipe, `/profile|/toast-picks`→Profile. showBack prop adds back button. Used on all pages. **IMPORTANT**: Do NOT add a Saved tab, do NOT add dot indicator — user explicitly requested these stay removed.
- **Search**: Matches restaurant names, categories, AND menu keywords. Each restaurant in ALL_SEARCHABLE has a `menus` array of dish/food keywords. Priority: name matches → category matches → menu matches
- **Animation rules**: framer-motion only for structural layout (drawer, modal, page transitions). All buttons/cards use plain HTML with CSS transitions. No stagger, no tween, no duration/ease. Spring params always: damping:26, stiffness:260, mass:0.8
- **Seed data**: 16 Bangkok restaurants in server/routes.ts (Thai, Japanese, American, Italian, Mexican, Korean, Vietnamese, Indian, Chinese, Cafe/Brunch, Seafood, Dessert). Seed clears and re-inserts when count < 10
- **Mock restaurant data**: Full detail entries for 26+ menu categories (IDs 201-483) covering Thai, Korean, Japanese, Italian, Mexican, Indian, Seafood, Western, French, Taiwanese cuisines plus breakfast/brunch, cafes, smoothie bowls, croissants, bubble tea, Thai milk tea, ice cream
- **Vibe frequency tracking**: `useVibeFrequency` hook (`client/src/hooks/use-vibe-frequency.ts`) stores usage counts in localStorage (`toast_vibe_freq` key). Top 8 most-used vibes shown on home screen, rest in "More vibes" bottom sheet modal. 14 total vibes: cheap, nearby, trending, hot, late, outdoor, saved, partner, healthy, spicy, sweets, coffee, fancy, delivery

## Interactive Map
- **Library**: Leaflet (react-free, vanilla JS) with CartoDB Light tiles (`basemaps.cartocdn.com/light_all`)
- **Component**: `client/src/components/InteractiveMap.tsx` — manages Leaflet map instance with custom divIcon markers
- **Tile styling**: CSS filter `saturate(0.35) contrast(0.88) brightness(1.08) sepia(0.15)` for warm illustrated look
- **Pin markers**: Custom HTML divIcons with emoji + price, selected state (dark bg + arrow), dimmed state for filtered pins
- **Interactions**: Pinch-to-zoom, pan-to-selected-pin, center/zoom prop reactivity via `map.setView()`
- **Pin data**: Real lat/lng coordinates for Bangkok restaurants in `RESTAURANT_PINS` array in Home.tsx

## Performance Optimizations
- **Map**: Leaflet with custom divIcon markers (no React re-render overhead), `invalidateSize()` on mount for reliable tile loading
- **Map iframe**: `loading="lazy"` on OpenStreetMap embeds (RestaurantDetail location map)
- **Restaurant images**: `loading="lazy"` on RestaurantRow card images
- **Toast logo preload**: Image stays in DOM via CSS `display:inline/none` toggle instead of conditional React rendering, eliminating remount delay when drawer expands

## Session Management
- `client/src/lib/sessionStore.ts` — global session store using `useSyncExternalStore` + `sessionStorage` persistence
- Sessions auto-created when entering GroupSwipe or SwipePage
- SessionBar component shows all active sessions with horizontal scroll, supports multiple concurrent sessions
- Each session card shows type (solo/group), label, live indicator, elapsed time, and close button

## External Integrations
- Leaflet + CartoDB: Interactive map tiles (no API key needed)
- OpenStreetMap: Static embed for RestaurantDetail location (no API key needed)
- LINE LIFF: Login, profile, share target picker via @line/liff SDK
- LINE URL scheme: Fallback sharing when not in LIFF context (`https://line.me/R/msg/text/`)
- Grab: Deep link to food delivery
- Google Places API: Not yet configured (using placeholder data)

## localStorage Keys
- `toast_vibe_freq` - Vibe usage frequency counts
- `toast_taste_profile` - Swipe preference tracking per cuisine
- `toast_line_profile` - Cached LINE profile data
- `toast_user_profile` - Local user profile settings (dietary, cuisines, budget, distance, partner)
- `toast_saved_restaurants` - Save buckets: `{ mine: number[], partner: number[] }` (migrates from old array format)
- `toast_owner_profile` - Owner/business profile settings (restaurantName, category, address, activePackages)

## Save Bucket System
- `useSavedRestaurants` hook (`client/src/hooks/use-saved-restaurants.ts`) — global store via `useSyncExternalStore`
- Two buckets: "mine" (personal favorites ❤️) and "partner" (shared date night picks 💕)
- `SaveBucketPicker` component (`client/src/components/SaveBucketPicker.tsx`) — dropdown picker that appears below the save button (uses portal rendering via createPortal when anchorRef is provided to escape overflow-hidden containers)
- HeartButton in RestaurantRow shows bucket picker on tap, displays ♥ (mine) or 💕 (partner) when saved
- RestaurantDetail save button also uses bucket picker
- Profile Stats card (white bg) shows saved/shared counts; Partner card shows shared save count with link
- Profile Saved section — expandable card showing all saved restaurants with unsave (X) button

## Toast Picks (Personalized Predictive Recommendations)
- Page: `client/src/pages/ToastPicks.tsx`, route: `/toast-picks`
- Accessed via "Can't decide? Let Toast pick for you" card at bottom of home BottomSheet
- Two-phase flow: "thinking" animation (2.2s) → "reveal" with top 3 scored restaurants
- Scoring model uses: taste profile (likes/dislikes/superlikes), cuisine preferences, budget, time of day (breakfast/lunch/dinner/late night/afternoon snack), trending score, rating, price fit
- First card gets golden "Top Pick" badge with sparkle icon
- Refresh button re-runs the model with slight randomization
- Time-contextual greeting: "Good morning", "Lunchtime", "Evening", "Late night", "Afternoon"

## Profile Page
- **Diner/Owner toggle**: Segmented control (ProfileToggle component) below avatar. Animated sliding pill indicator with spring transition.
- **Diner mode** (default): Stats row, Partner row, Saved section, Dietary section, Cuisines section, Settings section
- **Owner mode** (Business Dashboard with mini-analytics):
  - Restaurant info: name, category, address inputs
  - Performance Snapshot: 4 stat cards (Impressions, Swipe Views, Saves, Grab Taps) with trend arrows (green up/red down)
  - Today's Activity: Hourly bar chart (24 bars) with time labels
  - Quick Stats: Conversion rate, avg time on page, returning visitors
  - User Interactions: 5 action rows (swiped right, viewed details, opened map, tapped Grab, saved) with counts and colored icons
  - Full Analytics (expandable): 3 tabs — Overview (weekly performance bars + best day insight), Menu Cards (top 5 items ranked by like rate with golden #1 badge + dish insight), Peak Times (peak hours with activity bars + weekly heatmap grid with intensity legend + timing insight)
  - Photos section: Upload grid (placeholder)
  - Menus section: Add menu items (placeholder)
  - Promote Your Business: Two packages — "Menu Spotlight" (฿299/week, featured dish in swipe cards) and "Restaurant Boost" (฿599/week, priority in search results)
  - All insights use mock data from `generateMockInsights()` (realistic Bangkok restaurant patterns)
  - Owner profile stored in localStorage (`toast_owner_profile`)
