# Toast! MVP Technical Specification

## 1. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                        LINE App (Mobile)                                 │    │
│  │  ┌─────────────────────────────────────────────────────────────────┐    │    │
│  │  │                    LIFF Web View                                 │    │    │
│  │  │  ┌─────────────────────────────────────────────────────────┐    │    │    │
│  │  │  │              Next.js App (App Router)                    │    │    │    │
│  │  │  │                                                          │    │    │    │
│  │  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │    │    │    │
│  │  │  │  │ Zustand  │  │  React   │  │ Socket.IO│  │  LIFF   │  │    │    │    │
│  │  │  │  │  Store   │  │  Query   │  │  Client  │  │   SDK   │  │    │    │    │
│  │  │  │  └──────────┘  └──────────┘  └──────────┘  └─────────┘  │    │    │    │
│  │  │  └─────────────────────────────────────────────────────────┘    │    │    │
│  │  └─────────────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │ HTTPS (REST)      │ WSS (Socket.IO)   │
                    ▼                   ▼                   │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   API LAYER                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                        Load Balancer (nginx)                             │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                        │                                         │
│              ┌─────────────────────────┼─────────────────────────┐              │
│              ▼                         ▼                         ▼              │
│  ┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐       │
│  │   Node.js App     │    │   Node.js App     │    │   Node.js App     │       │
│  │   (Fastify)       │    │   (Fastify)       │    │   (Fastify)       │       │
│  │                   │    │                   │    │                   │       │
│  │ ┌───────────────┐ │    │ ┌───────────────┐ │    │ ┌───────────────┐ │       │
│  │ │ REST Routes   │ │    │ │ REST Routes   │ │    │ │ REST Routes   │ │       │
│  │ ├───────────────┤ │    │ ├───────────────┤ │    │ ├───────────────┤ │       │
│  │ │ Socket.IO     │ │    │ │ Socket.IO     │ │    │ │ Socket.IO     │ │       │
│  │ ├───────────────┤ │    │ ├───────────────┤ │    │ ├───────────────┤ │       │
│  │ │ Auth Middleware│ │    │ │ Auth Middleware│ │    │ │ Auth Middleware│ │       │
│  │ ├───────────────┤ │    │ ├───────────────┤ │    │ ├───────────────┤ │       │
│  │ │Decision Engine│ │    │ │Decision Engine│ │    │ │Decision Engine│ │       │
│  │ └───────────────┘ │    │ └───────────────┘ │    │ └───────────────┘ │       │
│  └───────────────────┘    └───────────────────┘    └───────────────────┘       │
│                                        │                                         │
└────────────────────────────────────────┼────────────────────────────────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                  DATA LAYER                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐  │
│  │                     │    │                     │    │                     │  │
│  │    PostgreSQL       │    │       Redis         │    │   Redis Pub/Sub     │  │
│  │    (Primary DB)     │    │    (Cache/State)    │    │   (Socket.IO)       │  │
│  │                     │    │                     │    │                     │  │
│  │ • Users             │    │ • Session tokens    │    │ • room:{id}         │  │
│  │ • Sessions          │    │ • Room state        │    │ • user:{id}         │  │
│  │ • Swipes            │    │ • Active users      │    │ • broadcast         │  │
│  │ • Matches           │    │ • Swipe progress    │    │                     │  │
│  │ • Restaurants       │    │ • Countdowns        │    │                     │  │
│  │ • Menus             │    │ • Rate limiting     │    │                     │  │
│  │ • Analytics         │    │                     │    │                     │  │
│  │                     │    │                     │    │                     │  │
│  └─────────────────────┘    └─────────────────────┘    └─────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘


                            DATA FLOW DIAGRAM

┌──────────┐  1. Open LIFF    ┌──────────┐  2. Verify Token  ┌──────────┐
│   User   │ ───────────────▶ │  LIFF    │ ────────────────▶ │  LINE    │
│  (LINE)  │                  │  Client  │ ◀──────────────── │  Server  │
└──────────┘                  └──────────┘   ID Token        └──────────┘
                                   │
                                   │ 3. Auth Request (ID Token)
                                   ▼
                              ┌──────────┐
                              │  Backend │
                              │   Auth   │
                              └──────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
              ┌──────────┐  ┌──────────┐  ┌──────────┐
              │  Verify  │  │  Create  │  │   Set    │
              │  w/LINE  │  │  Session │  │  Redis   │
              └──────────┘  └──────────┘  └──────────┘
                                   │
                                   ▼
                              ┌──────────┐
                              │  Return  │
                              │  JWT +   │
                              │  User    │
                              └──────────┘


                        REALTIME SYNC FLOW

User A                    Server                    User B
  │                          │                          │
  │  swipe:submit            │                          │
  │ ────────────────────────▶│                          │
  │                          │                          │
  │                   ┌──────┴──────┐                   │
  │                   │   Process   │                   │
  │                   │   Swipe     │                   │
  │                   │   + Store   │                   │
  │                   │   + Check   │                   │
  │                   │   Match     │                   │
  │                   └──────┬──────┘                   │
  │                          │                          │
  │  swipe:ack               │  room:progress:update    │
  │ ◀────────────────────────│─────────────────────────▶│
  │                          │                          │
  │                   [If Match Found]                  │
  │                          │                          │
  │  match:found             │  match:found             │
  │ ◀────────────────────────│─────────────────────────▶│
  │                          │                          │
```

---

## 2. Database Schema (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// USER DOMAIN
// ============================================

model User {
  id              String    @id @default(cuid())
  lineUserId      String    @unique @map("line_user_id")
  displayName     String    @map("display_name")
  pictureUrl      String?   @map("picture_url")

  // Preferences
  preferences     Json?     @default("{}")  // { cuisines: [], priceRange: [1,4], maxDistance: 5000 }

  // Onboarding
  onboardingStep  Int       @default(0) @map("onboarding_step")  // 0=not started, 3=complete
  onboardingDone  Boolean   @default(false) @map("onboarding_done")

  // Timestamps
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  lastActiveAt    DateTime  @default(now()) @map("last_active_at")

  // Relations
  ownedSessions   Session[]           @relation("SessionOwner")
  memberships     SessionMember[]
  swipes          Swipe[]
  analyticsEvents AnalyticsEvent[]

  @@map("users")
}

// ============================================
// SESSION DOMAIN
// ============================================

model Session {
  id              String          @id @default(cuid())
  code            String          @unique  // 6-char invite code

  // Session config
  mode            SessionMode     @default(GROUP)
  status          SessionStatus   @default(WAITING)
  maxMembers      Int             @default(5) @map("max_members")

  // Phase tracking
  phase           SessionPhase    @default(MENU_SWIPE)

  // Filters applied to this session
  filters         Json            @default("{}") // { cuisines, priceRange, maxDistance, location }

  // Owner
  ownerId         String          @map("owner_id")
  owner           User            @relation("SessionOwner", fields: [ownerId], references: [id])

  // Timing
  createdAt       DateTime        @default(now()) @map("created_at")
  startedAt       DateTime?       @map("started_at")
  completedAt     DateTime?       @map("completed_at")
  expiresAt       DateTime        @map("expires_at")  // 24h from creation

  // Relations
  members         SessionMember[]
  swipes          Swipe[]
  matches         Match[]
  decisions       Decision[]
  analyticsEvents AnalyticsEvent[]

  @@index([code])
  @@index([status])
  @@index([expiresAt])
  @@map("sessions")
}

model SessionMember {
  id              String              @id @default(cuid())

  sessionId       String              @map("session_id")
  session         Session             @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  userId          String              @map("user_id")
  user            User                @relation(fields: [userId], references: [id])

  // Member status
  status          MemberStatus        @default(ACTIVE)
  joinedAt        DateTime            @default(now()) @map("joined_at")
  lastActiveAt    DateTime            @default(now()) @map("last_active_at")

  // Progress tracking
  menuSwipeIndex  Int                 @default(0) @map("menu_swipe_index")
  restSwipeIndex  Int                 @default(0) @map("rest_swipe_index")
  superLikeUsed   Boolean             @default(false) @map("super_like_used")

  @@unique([sessionId, userId])
  @@index([sessionId])
  @@index([userId])
  @@map("session_members")
}

enum SessionMode {
  SOLO
  GROUP
}

enum SessionStatus {
  WAITING       // Waiting for members
  ACTIVE        // Swiping in progress
  DECIDING      // Computing decision
  COMPLETED     // Decision made
  EXPIRED       // Timed out
  CANCELLED     // Manually cancelled
}

enum SessionPhase {
  MENU_SWIPE        // Swiping menus
  MENU_RESULT       // Menu decided, showing result
  RESTAURANT_SWIPE  // Swiping restaurants for matched menu
  FINAL_RESULT      // Final decision
}

enum MemberStatus {
  ACTIVE
  IDLE        // >5 min inactive
  REMOVED     // >10 min inactive, kicked
  LEFT        // Voluntarily left
}

// ============================================
// CONTENT DOMAIN
// ============================================

model Menu {
  id              String          @id @default(cuid())
  name            String
  nameLocal       String?         @map("name_local")  // Thai/local name
  description     String?
  imageUrl        String          @map("image_url")

  // Categorization
  cuisineType     String          @map("cuisine_type")  // thai, japanese, italian, etc.
  tags            String[]        @default([])          // spicy, vegetarian, halal, etc.

  // Pricing
  priceRangeLow   Int             @map("price_range_low")   // in THB
  priceRangeHigh  Int             @map("price_range_high")

  // Metadata
  popularity      Float           @default(0)  // 0-1 score for sorting
  isActive        Boolean         @default(true) @map("is_active")

  createdAt       DateTime        @default(now()) @map("created_at")
  updatedAt       DateTime        @updatedAt @map("updated_at")

  // Relations
  restaurants     RestaurantMenu[]
  swipes          Swipe[]
  matches         Match[]
  decisions       Decision[]

  @@index([cuisineType])
  @@index([isActive])
  @@map("menus")
}

model Restaurant {
  id              String          @id @default(cuid())
  name            String
  nameLocal       String?         @map("name_local")
  description     String?
  imageUrl        String          @map("image_url")

  // Location
  latitude        Float
  longitude       Float
  address         String

  // Details
  priceLevel      Int             @map("price_level")  // 1-4
  rating          Float?          // 0-5
  reviewCount     Int             @default(0) @map("review_count")

  // Operating hours (JSON for flexibility)
  openingHours    Json            @map("opening_hours")  // { mon: [{open: "09:00", close: "22:00"}], ... }

  // Contact
  phone           String?
  lineOfficialId  String?         @map("line_official_id")
  website         String?
  googleMapsUrl   String?         @map("google_maps_url")

  // Metadata
  isActive        Boolean         @default(true) @map("is_active")

  createdAt       DateTime        @default(now()) @map("created_at")
  updatedAt       DateTime        @updatedAt @map("updated_at")

  // Relations
  menus           RestaurantMenu[]
  swipes          Swipe[]
  decisions       Decision[]

  @@index([latitude, longitude])
  @@index([isActive])
  @@map("restaurants")
}

model RestaurantMenu {
  id              String          @id @default(cuid())

  restaurantId    String          @map("restaurant_id")
  restaurant      Restaurant      @relation(fields: [restaurantId], references: [id], onDelete: Cascade)

  menuId          String          @map("menu_id")
  menu            Menu            @relation(fields: [menuId], references: [id], onDelete: Cascade)

  // Restaurant-specific pricing for this menu
  price           Int?            // Override price at this restaurant
  isAvailable     Boolean         @default(true) @map("is_available")

  @@unique([restaurantId, menuId])
  @@map("restaurant_menus")
}

// ============================================
// SWIPE DOMAIN
// ============================================

model Swipe {
  id              String          @id @default(cuid())

  sessionId       String          @map("session_id")
  session         Session         @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  userId          String          @map("user_id")
  user            User            @relation(fields: [userId], references: [id])

  // What was swiped
  menuId          String?         @map("menu_id")
  menu            Menu?           @relation(fields: [menuId], references: [id])

  restaurantId    String?         @map("restaurant_id")
  restaurant      Restaurant?     @relation(fields: [restaurantId], references: [id])

  // Swipe details
  direction       SwipeDirection
  phase           SessionPhase    // Which phase this swipe belongs to

  // Timing
  createdAt       DateTime        @default(now()) @map("created_at")
  swipeDurationMs Int?            @map("swipe_duration_ms")  // Time spent looking at card

  @@index([sessionId, phase])
  @@index([userId])
  @@index([menuId])
  @@index([restaurantId])
  @@map("swipes")
}

enum SwipeDirection {
  LEFT          // No / Dislike
  RIGHT         // Yes / Like
  UP            // Super Like
}

// ============================================
// MATCH & DECISION DOMAIN
// ============================================

model Match {
  id              String          @id @default(cuid())

  sessionId       String          @map("session_id")
  session         Session         @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  // What matched
  menuId          String?         @map("menu_id")
  menu            Menu?           @relation(fields: [menuId], references: [id])

  // Match quality
  matchType       MatchType       @map("match_type")
  confidence      Float           // 0-1
  voteCount       Int             @map("vote_count")
  totalVoters     Int             @map("total_voters")

  // If super liked
  hasSuperLike    Boolean         @default(false) @map("has_super_like")

  phase           SessionPhase
  createdAt       DateTime        @default(now()) @map("created_at")

  @@index([sessionId, phase])
  @@map("matches")
}

model Decision {
  id              String          @id @default(cuid())

  sessionId       String          @map("session_id")
  session         Session         @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  // Final choices
  menuId          String?         @map("menu_id")
  menu            Menu?           @relation(fields: [menuId], references: [id])

  restaurantId    String?         @map("restaurant_id")
  restaurant      Restaurant?     @relation(fields: [restaurantId], references: [id])

  // Decision metadata
  decisionType    DecisionType    @map("decision_type")
  confidence      Float           // 0-1

  // How decision was reached
  method          DecisionMethod

  // Voting breakdown (JSON)
  voteBreakdown   Json            @map("vote_breakdown")  // { menuId: { userId: direction, ... }, ... }

  // Timing
  createdAt       DateTime        @default(now()) @map("created_at")
  timeToDecisionMs Int            @map("time_to_decision_ms")

  @@index([sessionId])
  @@map("decisions")
}

enum MatchType {
  STRONG      // Majority (>50%)
  WEAK        // Plurality but not majority
  TIE         // Equal votes
  SUPER       // Has super like(s)
}

enum DecisionType {
  MENU
  RESTAURANT
}

enum DecisionMethod {
  UNANIMOUS       // Everyone agreed
  MAJORITY        // >50% agreed
  SUPER_LIKE      // Super like decided
  TIEBREAKER      // Random from tied options
  TIMEOUT         // Auto-selected due to timeout
}

// ============================================
// ANALYTICS DOMAIN
// ============================================

model AnalyticsEvent {
  id              String          @id @default(cuid())

  // Event identification
  eventType       String          @map("event_type")
  eventVersion    Int             @default(1) @map("event_version")

  // Context
  sessionId       String?         @map("session_id")
  session         Session?        @relation(fields: [sessionId], references: [id], onDelete: SetNull)

  userId          String?         @map("user_id")
  user            User?           @relation(fields: [userId], references: [id], onDelete: SetNull)

  // Event data (flexible JSON)
  payload         Json            @default("{}")

  // Metadata
  timestamp       DateTime        @default(now())
  clientTimestamp DateTime?       @map("client_timestamp")

  // Device/client info
  deviceInfo      Json?           @map("device_info")  // { platform, version, screenSize, etc. }

  @@index([eventType])
  @@index([sessionId])
  @@index([userId])
  @@index([timestamp])
  @@map("analytics_events")
}
```

---

## 3. Redis Session/State Design

```typescript
// src/redis/keys.ts

export const RedisKeys = {
  // User session token
  userSession: (userId: string) => `user:session:${userId}`,

  // Room/Session state
  roomState: (sessionId: string) => `room:${sessionId}:state`,
  roomMembers: (sessionId: string) => `room:${sessionId}:members`,
  roomSwipes: (sessionId: string, phase: string) => `room:${sessionId}:swipes:${phase}`,
  roomProgress: (sessionId: string) => `room:${sessionId}:progress`,

  // User presence
  userPresence: (userId: string) => `user:${userId}:presence`,
  userCurrentRoom: (userId: string) => `user:${userId}:room`,

  // Countdown timers
  roomCountdown: (sessionId: string) => `room:${sessionId}:countdown`,

  // Card deck (ordered set of cards for session)
  roomDeck: (sessionId: string, phase: string) => `room:${sessionId}:deck:${phase}`,

  // Rate limiting
  rateLimitSwipe: (userId: string) => `ratelimit:swipe:${userId}`,

  // Invite codes (for quick lookup)
  inviteCode: (code: string) => `invite:${code}`,
} as const;
```

```typescript
// src/redis/schemas.ts

// Room State - stored as JSON string in Redis
interface RoomState {
  sessionId: string;
  status: 'waiting' | 'active' | 'deciding' | 'completed';
  phase: 'menu_swipe' | 'menu_result' | 'restaurant_swipe' | 'final_result';
  mode: 'solo' | 'group';
  ownerId: string;

  // Filters
  filters: {
    cuisines: string[];
    priceRange: [number, number];
    maxDistance: number;  // meters
    location: { lat: number; lng: number } | null;
  };

  // Timing
  createdAt: number;      // Unix timestamp
  startedAt: number | null;
  lastActivityAt: number;

  // Phase-specific data
  matchedMenuId: string | null;   // Set after menu phase
  deckSize: number;               // Total cards in current deck
}

// Member State - stored in Hash
interface MemberState {
  odisplayName: string;
  pictureUrl: string | null;
  status: 'active' | 'idle' | 'removed';
  joinedAt: number;
  lastActiveAt: number;
  currentIndex: number;     // Current card index
  superLikeUsed: boolean;
}

// Progress State - stored as JSON for real-time sync
interface ProgressState {
  totalCards: number;
  memberProgress: {
    [userId: string]: {
      completed: number;
      isActive: boolean;
    };
  };
  phase: string;
  estimatedTimeRemaining: number;  // seconds
}

// Swipe Record - stored in Sorted Set
// Score = timestamp, Member = JSON string
interface SwipeRecord {
  odiserId: string;
  itemId: string;        // menuId or restaurantId
  direction: 'left' | 'right' | 'up';
  timestamp: number;
}

// Presence - simple string with TTL
// Value: JSON { status: 'online' | 'away', lastPing: timestamp }
```

```typescript
// src/redis/ttl.ts

export const RedisTTL = {
  // User session: 7 days
  USER_SESSION: 7 * 24 * 60 * 60,

  // Room state: 24 hours (matches invite expiry)
  ROOM_STATE: 24 * 60 * 60,

  // Presence: 30 seconds (requires heartbeat)
  PRESENCE: 30,

  // Completed room data: 1 hour (for result viewing)
  COMPLETED_ROOM: 60 * 60,

  // Rate limit window: 1 second
  RATE_LIMIT_SWIPE: 1,

  // Invite code: 24 hours
  INVITE_CODE: 24 * 60 * 60,
} as const;
```

```typescript
// src/redis/operations.ts

import Redis from 'ioredis';

export class RoomStateManager {
  constructor(private redis: Redis) {}

  async createRoom(state: RoomState): Promise<void> {
    const key = RedisKeys.roomState(state.sessionId);
    await this.redis.setex(key, RedisTTL.ROOM_STATE, JSON.stringify(state));

    // Also set invite code lookup
    await this.redis.setex(
      RedisKeys.inviteCode(state.code),
      RedisTTL.INVITE_CODE,
      state.sessionId
    );
  }

  async getRoom(sessionId: string): Promise<RoomState | null> {
    const data = await this.redis.get(RedisKeys.roomState(sessionId));
    return data ? JSON.parse(data) : null;
  }

  async updateRoom(sessionId: string, updates: Partial<RoomState>): Promise<void> {
    const current = await this.getRoom(sessionId);
    if (!current) throw new Error('Room not found');

    const updated = { ...current, ...updates, lastActivityAt: Date.now() };
    await this.redis.setex(
      RedisKeys.roomState(sessionId),
      RedisTTL.ROOM_STATE,
      JSON.stringify(updated)
    );
  }

  async addMember(sessionId: string, userId: string, member: MemberState): Promise<void> {
    await this.redis.hset(
      RedisKeys.roomMembers(sessionId),
      userId,
      JSON.stringify(member)
    );
  }

  async recordSwipe(sessionId: string, phase: string, swipe: SwipeRecord): Promise<void> {
    await this.redis.zadd(
      RedisKeys.roomSwipes(sessionId, phase),
      swipe.timestamp,
      JSON.stringify(swipe)
    );
  }

  async getSwipesForItem(sessionId: string, phase: string, itemId: string): Promise<SwipeRecord[]> {
    const all = await this.redis.zrange(RedisKeys.roomSwipes(sessionId, phase), 0, -1);
    return all
      .map(s => JSON.parse(s) as SwipeRecord)
      .filter(s => s.itemId === itemId);
  }

  async getAllMembers(sessionId: string): Promise<Map<string, MemberState>> {
    const data = await this.redis.hgetall(RedisKeys.roomMembers(sessionId));
    const members = new Map<string, MemberState>();
    for (const [userId, json] of Object.entries(data)) {
      members.set(userId, JSON.parse(json));
    }
    return members;
  }

  async updatePresence(userId: string): Promise<void> {
    await this.redis.setex(
      RedisKeys.userPresence(userId),
      RedisTTL.PRESENCE,
      JSON.stringify({ status: 'online', lastPing: Date.now() })
    );
  }

  async isUserOnline(userId: string): Promise<boolean> {
    const presence = await this.redis.get(RedisKeys.userPresence(userId));
    return presence !== null;
  }
}
```

---

## 4. Realtime Event Design (Socket.IO)

```typescript
// src/socket/events.ts

// ============================================
// CLIENT → SERVER EVENTS
// ============================================

interface ClientToServerEvents {
  // Connection & Authentication
  'auth:connect': (data: { token: string }) => void;

  // Room Management
  'room:join': (data: { sessionId: string }) => void;
  'room:leave': (data: { sessionId: string }) => void;
  'room:start': (data: { sessionId: string }) => void;  // Owner only

  // Swiping
  'swipe:submit': (data: {
    sessionId: string;
    itemId: string;       // menuId or restaurantId
    direction: 'left' | 'right' | 'up';
    durationMs: number;   // Time spent on card
  }) => void;

  // Presence
  'presence:ping': () => void;
  'presence:typing': (data: { sessionId: string }) => void;  // Future: chat

  // Phase transitions
  'phase:ready': (data: { sessionId: string; phase: string }) => void;
  'phase:continue': (data: { sessionId: string }) => void;  // Move to next phase
}

// ============================================
// SERVER → CLIENT EVENTS
// ============================================

interface ServerToClientEvents {
  // Connection
  'auth:success': (data: { userId: string; user: UserInfo }) => void;
  'auth:error': (data: { code: string; message: string }) => void;

  // Room State
  'room:state': (data: RoomStatePayload) => void;
  'room:joined': (data: { sessionId: string; member: MemberInfo }) => void;
  'room:left': (data: { sessionId: string; userId: string; reason: string }) => void;
  'room:started': (data: { sessionId: string; deck: CardInfo[] }) => void;
  'room:error': (data: { code: string; message: string }) => void;

  // Member Updates
  'member:joined': (data: { sessionId: string; member: MemberInfo }) => void;
  'member:left': (data: { sessionId: string; userId: string; reason: string }) => void;
  'member:idle': (data: { sessionId: string; userId: string }) => void;
  'member:removed': (data: { sessionId: string; userId: string; reason: string }) => void;
  'member:progress': (data: { sessionId: string; userId: string; progress: number }) => void;

  // Swipe Updates
  'swipe:ack': (data: { itemId: string; recorded: boolean }) => void;
  'swipe:progress': (data: {
    sessionId: string;
    totalCards: number;
    memberProgress: { [userId: string]: number };
  }) => void;

  // Match Events
  'match:found': (data: {
    sessionId: string;
    phase: string;
    itemId: string;
    matchType: 'strong' | 'weak' | 'super';
    confidence: number;
    votes: { [userId: string]: string };  // userId -> direction
  }) => void;

  'match:tie': (data: {
    sessionId: string;
    phase: string;
    tiedItems: Array<{ itemId: string; votes: number }>;
  }) => void;

  'match:none': (data: {
    sessionId: string;
    phase: string;
    topItems: Array<{ itemId: string; score: number }>;  // Top 3
  }) => void;

  // Phase Transitions
  'phase:transition': (data: {
    sessionId: string;
    fromPhase: string;
    toPhase: string;
    data: any;  // Phase-specific data
  }) => void;

  'phase:menu_result': (data: {
    sessionId: string;
    menu: MenuInfo;
    matchType: string;
    confidence: number;
    restaurants: RestaurantInfo[];  // Restaurants serving this menu
  }) => void;

  'phase:final_result': (data: {
    sessionId: string;
    menu: MenuInfo;
    restaurant: RestaurantInfo;
    decision: DecisionInfo;
  }) => void;

  // Countdown
  'countdown:start': (data: { sessionId: string; seconds: number; reason: string }) => void;
  'countdown:tick': (data: { sessionId: string; remaining: number }) => void;
  'countdown:end': (data: { sessionId: string; action: string }) => void;

  // Presence
  'presence:update': (data: { userId: string; status: 'online' | 'away' | 'offline' }) => void;
}

// ============================================
// PAYLOAD TYPES
// ============================================

interface RoomStatePayload {
  sessionId: string;
  code: string;
  status: string;
  phase: string;
  mode: string;
  owner: MemberInfo;
  members: MemberInfo[];
  filters: SessionFilters;
  deck?: CardInfo[];
  progress?: ProgressInfo;
  matchedMenu?: MenuInfo;
}

interface MemberInfo {
  userId: string;
  displayName: string;
  pictureUrl: string | null;
  status: string;
  progress: number;
  isOwner: boolean;
}

interface CardInfo {
  id: string;
  type: 'menu' | 'restaurant';
  name: string;
  nameLocal?: string;
  imageUrl: string;
  description?: string;

  // Menu-specific
  cuisineType?: string;
  priceRange?: [number, number];
  tags?: string[];

  // Restaurant-specific
  distance?: number;
  rating?: number;
  priceLevel?: number;
  isOpen?: boolean;
}

interface MenuInfo {
  id: string;
  name: string;
  nameLocal?: string;
  imageUrl: string;
  cuisineType: string;
  priceRange: [number, number];
}

interface RestaurantInfo {
  id: string;
  name: string;
  nameLocal?: string;
  imageUrl: string;
  distance: number;
  rating?: number;
  priceLevel: number;
  isOpen: boolean;
  address: string;
  googleMapsUrl?: string;
}

interface DecisionInfo {
  id: string;
  method: string;
  confidence: number;
  timeToDecisionMs: number;
  votes: { [userId: string]: { menu: string; restaurant: string } };
}

interface SessionFilters {
  cuisines: string[];
  priceRange: [number, number];
  maxDistance: number;
  location: { lat: number; lng: number } | null;
}

interface ProgressInfo {
  totalCards: number;
  memberProgress: { [userId: string]: number };
  estimatedTimeRemaining: number;
}
```

```typescript
// src/socket/rooms.ts - Socket.IO Room Management

export const SocketRooms = {
  // Session room - all members
  session: (sessionId: string) => `session:${sessionId}`,

  // User's personal room - for direct messages
  user: (userId: string) => `user:${userId}`,
} as const;

// Usage in handlers:
// socket.join(SocketRooms.session(sessionId))
// io.to(SocketRooms.session(sessionId)).emit('match:found', data)
```

---

## 5. REST API Endpoints

### Base URL: `/api/v1`

### Authentication

```yaml
POST /auth/line
  Description: Authenticate with LINE LIFF token

  Request:
    Headers:
      Content-Type: application/json
    Body:
      {
        "idToken": "eyJhbGciOiJIUzI1NiJ9...",  // LINE LIFF ID token
        "liffId": "1234567890-abcdefgh"
      }

  Response 200:
    {
      "success": true,
      "data": {
        "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "expiresIn": 604800,
        "user": {
          "id": "clx1234567890",
          "lineUserId": "U1234567890abcdef",
          "displayName": "John Doe",
          "pictureUrl": "https://profile.line-scdn.net/...",
          "onboardingDone": false,
          "preferences": null
        }
      }
    }

  Response 401:
    {
      "success": false,
      "error": {
        "code": "INVALID_TOKEN",
        "message": "LINE token verification failed"
      }
    }

POST /auth/refresh
  Description: Refresh access token

  Request:
    Headers:
      Authorization: Bearer <accessToken>

  Response 200:
    {
      "success": true,
      "data": {
        "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "expiresIn": 604800
      }
    }
```

### User

```yaml
GET /users/me
  Description: Get current user profile
  Auth: Required

  Response 200:
    {
      "success": true,
      "data": {
        "id": "clx1234567890",
        "displayName": "John Doe",
        "pictureUrl": "https://profile.line-scdn.net/...",
        "preferences": {
          "cuisines": ["thai", "japanese"],
          "priceRange": [1, 3],
          "maxDistance": 3000
        },
        "onboardingStep": 3,
        "onboardingDone": true
      }
    }

PATCH /users/me
  Description: Update user profile/preferences
  Auth: Required

  Request:
    {
      "displayName": "Johnny",
      "preferences": {
        "cuisines": ["thai", "japanese", "italian"],
        "priceRange": [2, 4],
        "maxDistance": 5000
      }
    }

  Response 200:
    {
      "success": true,
      "data": { ...updatedUser }
    }

PATCH /users/me/onboarding
  Description: Update onboarding progress
  Auth: Required

  Request:
    {
      "step": 2,
      "completed": false
    }

  Response 200:
    {
      "success": true,
      "data": {
        "onboardingStep": 2,
        "onboardingDone": false
      }
    }

POST /users/me/onboarding/complete
  Description: Mark onboarding as complete
  Auth: Required

  Response 200:
    {
      "success": true,
      "data": {
        "onboardingDone": true
      }
    }
```

### Sessions

```yaml
POST /sessions
  Description: Create a new session (solo or group)
  Auth: Required

  Request:
    {
      "mode": "group",
      "filters": {
        "cuisines": ["thai", "japanese"],
        "priceRange": [1, 3],
        "maxDistance": 3000,
        "location": {
          "lat": 13.7563,
          "lng": 100.5018
        }
      }
    }

  Response 201:
    {
      "success": true,
      "data": {
        "id": "clx_session_123",
        "code": "ABC123",
        "mode": "group",
        "status": "waiting",
        "phase": "menu_swipe",
        "inviteUrl": "https://liff.line.me/123456-abcdef?session=ABC123",
        "expiresAt": "2024-01-02T12:00:00Z",
        "owner": {
          "id": "clx1234567890",
          "displayName": "John Doe",
          "pictureUrl": "..."
        },
        "members": [],
        "filters": { ... }
      }
    }

GET /sessions/:sessionId
  Description: Get session details
  Auth: Required (must be member)

  Response 200:
    {
      "success": true,
      "data": {
        "id": "clx_session_123",
        "code": "ABC123",
        "mode": "group",
        "status": "active",
        "phase": "menu_swipe",
        "owner": { ... },
        "members": [
          {
            "id": "clx1234567890",
            "displayName": "John Doe",
            "pictureUrl": "...",
            "status": "active",
            "progress": 5,
            "isOwner": true
          },
          {
            "id": "clx0987654321",
            "displayName": "Jane Smith",
            "pictureUrl": "...",
            "status": "active",
            "progress": 3,
            "isOwner": false
          }
        ],
        "filters": { ... },
        "deck": {
          "total": 20,
          "remaining": 15
        }
      }
    }

POST /sessions/join
  Description: Join a session via invite code
  Auth: Required

  Request:
    {
      "code": "ABC123"
    }

  Response 200:
    {
      "success": true,
      "data": {
        "sessionId": "clx_session_123",
        "session": { ... full session data }
      }
    }

  Response 400:
    {
      "success": false,
      "error": {
        "code": "SESSION_FULL",
        "message": "This session has reached maximum capacity"
      }
    }

  Response 404:
    {
      "success": false,
      "error": {
        "code": "SESSION_NOT_FOUND",
        "message": "Invalid or expired invite code"
      }
    }

POST /sessions/:sessionId/start
  Description: Start the session (owner only)
  Auth: Required (owner)

  Response 200:
    {
      "success": true,
      "data": {
        "sessionId": "clx_session_123",
        "status": "active",
        "deck": [
          {
            "id": "menu_123",
            "type": "menu",
            "name": "Pad Thai",
            "imageUrl": "...",
            "cuisineType": "thai",
            "priceRange": [80, 150]
          },
          ...
        ]
      }
    }

POST /sessions/:sessionId/leave
  Description: Leave a session
  Auth: Required (member)

  Response 200:
    {
      "success": true,
      "data": {
        "left": true
      }
    }

GET /sessions/:sessionId/result
  Description: Get final session result
  Auth: Required (member)

  Response 200:
    {
      "success": true,
      "data": {
        "sessionId": "clx_session_123",
        "decision": {
          "menu": {
            "id": "menu_123",
            "name": "Pad Thai",
            "imageUrl": "...",
            "cuisineType": "thai"
          },
          "restaurant": {
            "id": "rest_456",
            "name": "Thipsamai",
            "imageUrl": "...",
            "address": "313 Maha Chai Rd, Bangkok",
            "distance": 1200,
            "rating": 4.5,
            "googleMapsUrl": "https://maps.google.com/..."
          },
          "method": "majority",
          "confidence": 0.85,
          "timeToDecisionMs": 72000,
          "votes": {
            "clx1234567890": { "menu": "right", "restaurant": "right" },
            "clx0987654321": { "menu": "right", "restaurant": "up" }
          }
        }
      }
    }

POST /sessions/:sessionId/restart
  Description: Restart session with same group
  Auth: Required (owner)

  Response 201:
    {
      "success": true,
      "data": {
        "newSessionId": "clx_session_456",
        "session": { ... new session data }
      }
    }
```

### Menus & Restaurants

```yaml
GET /menus
  Description: Get menus (filtered)
  Auth: Required

  Query Parameters:
    cuisines: string[] (comma-separated)
    priceMin: number
    priceMax: number
    tags: string[] (comma-separated)
    limit: number (default: 50)
    offset: number (default: 0)

  Response 200:
    {
      "success": true,
      "data": {
        "menus": [
          {
            "id": "menu_123",
            "name": "Pad Thai",
            "nameLocal": "ผัดไทย",
            "imageUrl": "...",
            "cuisineType": "thai",
            "priceRange": [80, 150],
            "tags": ["signature", "noodles"],
            "restaurantCount": 45
          },
          ...
        ],
        "total": 150,
        "hasMore": true
      }
    }

GET /menus/:menuId/restaurants
  Description: Get restaurants serving a specific menu
  Auth: Required

  Query Parameters:
    lat: number (required)
    lng: number (required)
    maxDistance: number (meters, default: 5000)
    priceLevel: number[] (1-4)
    openNow: boolean
    limit: number (default: 20)

  Response 200:
    {
      "success": true,
      "data": {
        "restaurants": [
          {
            "id": "rest_456",
            "name": "Thipsamai",
            "nameLocal": "ทิพย์สมัย",
            "imageUrl": "...",
            "distance": 1200,
            "rating": 4.5,
            "priceLevel": 2,
            "isOpen": true,
            "address": "313 Maha Chai Rd",
            "menuPrice": 100,
            "googleMapsUrl": "..."
          },
          ...
        ],
        "total": 12
      }
    }

GET /restaurants/:restaurantId
  Description: Get restaurant details
  Auth: Required

  Response 200:
    {
      "success": true,
      "data": {
        "id": "rest_456",
        "name": "Thipsamai",
        "nameLocal": "ทิพย์สมัย",
        "imageUrl": "...",
        "description": "Famous Pad Thai restaurant since 1966",
        "address": "313 Maha Chai Rd, Samran Rat, Phra Nakhon, Bangkok",
        "latitude": 13.7515,
        "longitude": 100.5015,
        "priceLevel": 2,
        "rating": 4.5,
        "reviewCount": 2341,
        "phone": "+66 2 226 6666",
        "openingHours": {
          "mon": [{ "open": "17:00", "close": "02:00" }],
          "tue": [{ "open": "17:00", "close": "02:00" }],
          ...
        },
        "isCurrentlyOpen": true,
        "googleMapsUrl": "https://maps.google.com/...",
        "menus": [
          { "id": "menu_123", "name": "Pad Thai", "price": 100 },
          { "id": "menu_124", "name": "Pad Thai Wrapped in Egg", "price": 120 }
        ]
      }
    }
```

### Analytics

```yaml
POST /analytics/events
  Description: Track analytics event
  Auth: Required

  Request:
    {
      "eventType": "swipe",
      "sessionId": "clx_session_123",
      "payload": {
        "itemId": "menu_123",
        "itemType": "menu",
        "direction": "right",
        "durationMs": 2500,
        "cardIndex": 5
      },
      "clientTimestamp": "2024-01-01T12:00:00Z",
      "deviceInfo": {
        "platform": "ios",
        "liffVersion": "2.21.0",
        "screenWidth": 390,
        "screenHeight": 844
      }
    }

  Response 202:
    {
      "success": true,
      "data": {
        "eventId": "evt_abc123"
      }
    }

POST /analytics/events/batch
  Description: Track multiple events at once
  Auth: Required

  Request:
    {
      "events": [
        { "eventType": "swipe", ... },
        { "eventType": "swipe", ... }
      ]
    }

  Response 202:
    {
      "success": true,
      "data": {
        "recorded": 5,
        "failed": 0
      }
    }
```

---

## 6. Decision Engine Pseudocode

```typescript
// src/engine/decision-engine.ts

interface SwipeData {
  userId: string;
  itemId: string;
  direction: 'left' | 'right' | 'up';
}

interface MatchResult {
  type: 'strong' | 'weak' | 'tie' | 'super' | 'none';
  winnerId: string | null;
  confidence: number;
  tiedItems?: string[];
  topItems?: Array<{ itemId: string; score: number }>;
  votes: Record<string, Record<string, string>>; // itemId -> userId -> direction
}

interface DecisionConfig {
  strongMatchThreshold: number;  // Default: 0.5 (majority)
  superLikeWeight: number;       // Default: 2.0 (counts as 2 votes)
  minVotesRequired: number;      // Minimum votes to make decision
}

class DecisionEngine {
  private config: DecisionConfig = {
    strongMatchThreshold: 0.5,
    superLikeWeight: 2.0,
    minVotesRequired: 1,
  };

  /**
   * Process all swipes and determine match result
   */
  calculateMatch(
    swipes: SwipeData[],
    memberCount: number,
    itemIds: string[]
  ): MatchResult {
    // Step 1: Aggregate votes per item
    const voteMap = this.aggregateVotes(swipes, itemIds);

    // Step 2: Calculate scores for each item
    const scores = this.calculateScores(voteMap, memberCount);

    // Step 3: Check for super like winner
    const superLikeWinner = this.checkSuperLikeWinner(voteMap, memberCount);
    if (superLikeWinner) {
      return {
        type: 'super',
        winnerId: superLikeWinner.itemId,
        confidence: superLikeWinner.confidence,
        votes: this.formatVotes(voteMap),
      };
    }

    // Step 4: Sort by score and determine match type
    const sortedItems = Object.entries(scores)
      .filter(([_, score]) => score.positiveVotes > 0)
      .sort((a, b) => b[1].weightedScore - a[1].weightedScore);

    if (sortedItems.length === 0) {
      return {
        type: 'none',
        winnerId: null,
        confidence: 0,
        topItems: [],
        votes: this.formatVotes(voteMap),
      };
    }

    const [topItemId, topScore] = sortedItems[0];
    const topRatio = topScore.positiveVotes / memberCount;

    // Step 5: Check for strong match (majority)
    if (topRatio > this.config.strongMatchThreshold) {
      return {
        type: 'strong',
        winnerId: topItemId,
        confidence: topRatio,
        votes: this.formatVotes(voteMap),
      };
    }

    // Step 6: Check for tie
    if (sortedItems.length > 1) {
      const [secondItemId, secondScore] = sortedItems[1];
      if (topScore.weightedScore === secondScore.weightedScore) {
        const tiedItems = sortedItems
          .filter(([_, s]) => s.weightedScore === topScore.weightedScore)
          .map(([id]) => id);

        return {
          type: 'tie',
          winnerId: null,
          confidence: topRatio,
          tiedItems,
          votes: this.formatVotes(voteMap),
        };
      }
    }

    // Step 7: Weak match (plurality but not majority)
    return {
      type: 'weak',
      winnerId: topItemId,
      confidence: topRatio,
      topItems: sortedItems.slice(0, 3).map(([id, score]) => ({
        itemId: id,
        score: score.weightedScore,
      })),
      votes: this.formatVotes(voteMap),
    };
  }

  /**
   * Aggregate swipes into vote map
   */
  private aggregateVotes(
    swipes: SwipeData[],
    itemIds: string[]
  ): Map<string, Map<string, string>> {
    const voteMap = new Map<string, Map<string, string>>();

    // Initialize all items
    for (const itemId of itemIds) {
      voteMap.set(itemId, new Map());
    }

    // Populate with swipes
    for (const swipe of swipes) {
      const itemVotes = voteMap.get(swipe.itemId);
      if (itemVotes) {
        itemVotes.set(swipe.userId, swipe.direction);
      }
    }

    return voteMap;
  }

  /**
   * Calculate weighted scores for each item
   */
  private calculateScores(
    voteMap: Map<string, Map<string, string>>,
    memberCount: number
  ): Record<string, { positiveVotes: number; weightedScore: number; superLikes: number }> {
    const scores: Record<string, { positiveVotes: number; weightedScore: number; superLikes: number }> = {};

    for (const [itemId, votes] of voteMap) {
      let positiveVotes = 0;
      let weightedScore = 0;
      let superLikes = 0;

      for (const [_, direction] of votes) {
        if (direction === 'right') {
          positiveVotes += 1;
          weightedScore += 1;
        } else if (direction === 'up') {
          positiveVotes += 1;
          superLikes += 1;
          weightedScore += this.config.superLikeWeight;
        }
        // 'left' adds nothing
      }

      scores[itemId] = { positiveVotes, weightedScore, superLikes };
    }

    return scores;
  }

  /**
   * Check if super like creates instant winner
   * Rule: If everyone super-likes the same item, it wins instantly
   */
  private checkSuperLikeWinner(
    voteMap: Map<string, Map<string, string>>,
    memberCount: number
  ): { itemId: string; confidence: number } | null {
    for (const [itemId, votes] of voteMap) {
      let superLikeCount = 0;
      for (const [_, direction] of votes) {
        if (direction === 'up') superLikeCount++;
      }

      // All members super-liked this item
      if (superLikeCount === memberCount && memberCount > 0) {
        return { itemId, confidence: 1.0 };
      }
    }

    return null;
  }

  /**
   * Break a tie using fair random selection
   */
  resolveTie(tiedItemIds: string[], sessionId: string): string {
    // Use session ID as seed for deterministic "randomness"
    // This ensures all clients see the same result
    const seed = this.hashString(sessionId);
    const index = seed % tiedItemIds.length;
    return tiedItemIds[index];
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private formatVotes(
    voteMap: Map<string, Map<string, string>>
  ): Record<string, Record<string, string>> {
    const result: Record<string, Record<string, string>> = {};
    for (const [itemId, votes] of voteMap) {
      result[itemId] = Object.fromEntries(votes);
    }
    return result;
  }

  /**
   * Check if session can proceed to decision
   */
  canDecide(swipes: SwipeData[], memberCount: number, deckSize: number): boolean {
    // All members have swiped all cards
    const userSwipeCounts = new Map<string, number>();
    for (const swipe of swipes) {
      userSwipeCounts.set(
        swipe.userId,
        (userSwipeCounts.get(swipe.userId) || 0) + 1
      );
    }

    if (userSwipeCounts.size < memberCount) {
      return false;
    }

    for (const [_, count] of userSwipeCounts) {
      if (count < deckSize) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check for early match (strong match before all swipes complete)
   */
  checkEarlyMatch(
    swipes: SwipeData[],
    memberCount: number,
    itemId: string
  ): { isMatch: boolean; confidence: number } {
    const itemSwipes = swipes.filter(s => s.itemId === itemId);

    // Need all members to have swiped this item
    if (itemSwipes.length < memberCount) {
      return { isMatch: false, confidence: 0 };
    }

    const positiveVotes = itemSwipes.filter(
      s => s.direction === 'right' || s.direction === 'up'
    ).length;

    const ratio = positiveVotes / memberCount;

    return {
      isMatch: ratio > this.config.strongMatchThreshold,
      confidence: ratio,
    };
  }
}

export const decisionEngine = new DecisionEngine();
```

```typescript
// src/engine/session-flow.ts

class SessionFlowController {
  /**
   * Main flow controller for session progression
   */
  async processSwipe(
    sessionId: string,
    userId: string,
    swipe: SwipeData
  ): Promise<SwipeResult> {
    const room = await roomStateManager.getRoom(sessionId);
    if (!room) throw new Error('Session not found');

    // 1. Record swipe
    await roomStateManager.recordSwipe(sessionId, room.phase, {
      userId,
      itemId: swipe.itemId,
      direction: swipe.direction,
      timestamp: Date.now(),
    });

    // 2. Persist to database (async, non-blocking)
    this.persistSwipeAsync(sessionId, userId, swipe, room.phase);

    // 3. Track analytics
    this.trackSwipeEvent(sessionId, userId, swipe);

    // 4. Check for early match on this item
    const members = await roomStateManager.getAllMembers(sessionId);
    const memberCount = [...members.values()].filter(m => m.status === 'active').length;

    const allSwipes = await this.getAllSwipesForPhase(sessionId, room.phase);
    const earlyMatch = decisionEngine.checkEarlyMatch(allSwipes, memberCount, swipe.itemId);

    if (earlyMatch.isMatch) {
      return {
        type: 'early_match',
        matchedItemId: swipe.itemId,
        confidence: earlyMatch.confidence,
      };
    }

    // 5. Check if all members completed all swipes
    const deck = await this.getDeck(sessionId, room.phase);
    if (decisionEngine.canDecide(allSwipes, memberCount, deck.length)) {
      return {
        type: 'ready_for_decision',
      };
    }

    // 6. Normal swipe recorded
    return {
      type: 'recorded',
      progress: this.calculateProgress(allSwipes, memberCount, deck.length),
    };
  }

  /**
   * Compute final decision for current phase
   */
  async computeDecision(sessionId: string): Promise<PhaseResult> {
    const room = await roomStateManager.getRoom(sessionId);
    if (!room) throw new Error('Session not found');

    const members = await roomStateManager.getAllMembers(sessionId);
    const memberCount = [...members.values()].filter(m => m.status === 'active').length;

    const allSwipes = await this.getAllSwipesForPhase(sessionId, room.phase);
    const deck = await this.getDeck(sessionId, room.phase);
    const itemIds = deck.map(card => card.id);

    const matchResult = decisionEngine.calculateMatch(allSwipes, memberCount, itemIds);

    // Handle based on match type
    switch (matchResult.type) {
      case 'strong':
      case 'super':
        return this.handleStrongMatch(sessionId, room, matchResult);

      case 'weak':
        return this.handleWeakMatch(sessionId, room, matchResult);

      case 'tie':
        return this.handleTie(sessionId, room, matchResult);

      case 'none':
        return this.handleNoMatch(sessionId, room, matchResult);
    }
  }

  private async handleStrongMatch(
    sessionId: string,
    room: RoomState,
    match: MatchResult
  ): Promise<PhaseResult> {
    if (room.phase === 'menu_swipe') {
      // Menu matched - transition to restaurant phase
      const menu = await this.getMenu(match.winnerId!);
      const restaurants = await this.getRestaurantsForMenu(match.winnerId!, room.filters);

      await roomStateManager.updateRoom(sessionId, {
        phase: 'menu_result',
        matchedMenuId: match.winnerId,
      });

      return {
        phase: 'menu_result',
        result: 'match',
        menu,
        restaurants,
        matchType: match.type,
        confidence: match.confidence,
        nextPhase: 'restaurant_swipe',
      };
    } else {
      // Restaurant matched - final decision
      const restaurant = await this.getRestaurant(match.winnerId!);
      const menu = await this.getMenu(room.matchedMenuId!);

      await this.finalizeDecision(sessionId, room, menu, restaurant, match);

      return {
        phase: 'final_result',
        result: 'decided',
        menu,
        restaurant,
        matchType: match.type,
        confidence: match.confidence,
      };
    }
  }

  private async handleTie(
    sessionId: string,
    room: RoomState,
    match: MatchResult
  ): Promise<PhaseResult> {
    // Use deterministic tie-breaker
    const winnerId = decisionEngine.resolveTie(match.tiedItems!, sessionId);

    // Treat as weak match with tie-breaker method
    return this.handleStrongMatch(sessionId, room, {
      ...match,
      type: 'weak',
      winnerId,
    });
  }

  private async handleNoMatch(
    sessionId: string,
    room: RoomState,
    match: MatchResult
  ): Promise<PhaseResult> {
    // Show top 3 and let group discuss or restart
    return {
      phase: room.phase,
      result: 'no_match',
      topItems: match.topItems || [],
      message: 'No clear winner. Consider restarting with different preferences.',
    };
  }

  private async finalizeDecision(
    sessionId: string,
    room: RoomState,
    menu: Menu,
    restaurant: Restaurant,
    match: MatchResult
  ): Promise<void> {
    // Calculate time to decision
    const timeToDecisionMs = Date.now() - room.startedAt!;

    // Persist decision
    await prisma.decision.create({
      data: {
        sessionId,
        menuId: menu.id,
        restaurantId: restaurant.id,
        decisionType: 'RESTAURANT',
        confidence: match.confidence,
        method: this.mapMatchTypeToMethod(match.type),
        voteBreakdown: match.votes,
        timeToDecisionMs,
      },
    });

    // Update session status
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        phase: 'FINAL_RESULT',
        completedAt: new Date(),
      },
    });

    await roomStateManager.updateRoom(sessionId, {
      status: 'completed',
      phase: 'final_result',
    });

    // Track analytics
    await this.trackDecisionEvent(sessionId, {
      menuId: menu.id,
      restaurantId: restaurant.id,
      timeToDecisionMs,
      method: match.type,
      confidence: match.confidence,
    });
  }

  private mapMatchTypeToMethod(type: MatchResult['type']): DecisionMethod {
    switch (type) {
      case 'strong': return 'MAJORITY';
      case 'super': return 'SUPER_LIKE';
      case 'weak': return 'MAJORITY';
      case 'tie': return 'TIEBREAKER';
      default: return 'MAJORITY';
    }
  }
}
```

---

## 7. Frontend Screen List & Component Responsibilities

```
screens/
├── onboarding/
│   ├── OnboardingScreen.tsx          # Container with step management
│   ├── OnboardingStep1.tsx           # Welcome + value prop
│   ├── OnboardingStep2.tsx           # Quick preferences (cuisines)
│   └── OnboardingStep3.tsx           # How it works (swipe tutorial)
│
├── home/
│   └── HomeScreen.tsx                # Main entry: Solo/Group mode selection
│
├── session/
│   ├── CreateSessionScreen.tsx       # Set filters, create session
│   ├── JoinSessionScreen.tsx         # Enter invite code
│   ├── WaitingRoomScreen.tsx         # Lobby: see members, start button
│   ├── SwipeScreen.tsx               # Core swipe interface
│   ├── MenuResultScreen.tsx          # Menu decided, show restaurants
│   └── FinalResultScreen.tsx         # Final decision display
│
└── profile/
    └── ProfileScreen.tsx             # User preferences, history
```

### Component Architecture

```typescript
// components/

// === LAYOUT ===
components/layout/
├── AppShell.tsx                      # Main app wrapper with header/nav
├── Header.tsx                        # Session info, back button, menu
└── BottomNav.tsx                     # Navigation (if needed)

// === SWIPE SYSTEM ===
components/swipe/
├── SwipeCard.tsx                     # Individual swipeable card
│   Props: {
│     item: CardInfo;
│     onSwipe: (direction: Direction) => void;
│     disabled: boolean;
│   }
│   Responsibilities:
│   - Gesture handling (pan, release)
│   - Swipe direction detection
│   - Animation (spring physics)
│   - Visual feedback (tilt, opacity)
│
├── SwipeDeck.tsx                     # Card stack manager
│   Props: {
│     cards: CardInfo[];
│     currentIndex: number;
│     onSwipe: (itemId: string, direction: Direction) => void;
│     onComplete: () => void;
│   }
│   Responsibilities:
│   - Card stack rendering (top 3 visible)
│   - Index management
│   - Preload next cards
│   - Empty state handling
│
├── SwipeControls.tsx                 # Button controls (left/right/up)
│   Props: {
│     onSwipe: (direction: Direction) => void;
│     superLikeAvailable: boolean;
│     disabled: boolean;
│   }
│
├── SwipeProgress.tsx                 # Progress indicator
│   Props: {
│     current: number;
│     total: number;
│     memberProgress?: Map<string, number>;
│   }
│
└── SwipeHint.tsx                     # Tutorial overlay for first use

// === SESSION ===
components/session/
├── MemberList.tsx                    # Participant avatars + status
│   Props: {
│     members: MemberInfo[];
│     showProgress: boolean;
│   }
│
├── MemberAvatar.tsx                  # Single member with status indicator
│   Props: {
│     member: MemberInfo;
│     size: 'sm' | 'md' | 'lg';
│   }
│
├── InviteShare.tsx                   # Share invite link/code
│   Props: {
│     code: string;
│     inviteUrl: string;
│   }
│   Responsibilities:
│   - Copy to clipboard
│   - LINE share integration
│   - QR code display
│
├── SessionTimer.tsx                  # Countdown/elapsed timer
│   Props: {
│     startedAt: Date;
│     timeLimit?: number;
│   }
│
├── FilterBadges.tsx                  # Display active filters
│   Props: {
│     filters: SessionFilters;
│   }
│
└── ConfidenceMeter.tsx               # Visual match confidence display
    Props: {
      confidence: number;
      matchType: MatchType;
    }

// === RESULTS ===
components/result/
├── MenuCard.tsx                      # Menu result display
│   Props: {
│     menu: MenuInfo;
│     matchType: MatchType;
│     confidence: number;
│   }
│
├── RestaurantCard.tsx                # Restaurant result with actions
│   Props: {
│     restaurant: RestaurantInfo;
│     onOpenMap: () => void;
│     onShare: () => void;
│   }
│
├── VoteBreakdown.tsx                 # Who voted what
│   Props: {
│     votes: VoteMap;
│     members: MemberInfo[];
│   }
│
├── DecisionSummary.tsx               # How decision was reached
│   Props: {
│     method: DecisionMethod;
│     timeToDecision: number;
│     confidence: number;
│   }
│
└── ActionButtons.tsx                 # Map/Share/Restart actions
    Props: {
      restaurant: RestaurantInfo;
      sessionId: string;
      onRestart: () => void;
    }

// === FORMS ===
components/forms/
├── PreferenceSelector.tsx            # Cuisine/price/distance picker
│   Props: {
│     value: Preferences;
│     onChange: (prefs: Preferences) => void;
│   }
│
├── CuisineChips.tsx                  # Multi-select cuisine tags
├── PriceRangeSlider.tsx              # 1-4 price range
└── DistanceSlider.tsx                # Max distance selector

// === COMMON ===
components/common/
├── Button.tsx                        # shadcn/ui button wrapper
├── Card.tsx                          # shadcn/ui card wrapper
├── Avatar.tsx                        # User avatar with fallback
├── Badge.tsx                         # Status/tag badges
├── Loader.tsx                        # Loading states
├── ErrorBoundary.tsx                 # Error handling
└── Toast.tsx                         # Notification toasts
```

### State Management (Zustand)

```typescript
// stores/

stores/
├── authStore.ts                      # User auth state
│   State: {
│     user: User | null;
│     token: string | null;
│     isAuthenticated: boolean;
│     isLoading: boolean;
│   }
│   Actions: {
│     login(idToken: string): Promise<void>;
│     logout(): void;
│     refreshToken(): Promise<void>;
│   }
│
├── sessionStore.ts                   # Current session state
│   State: {
│     session: Session | null;
│     members: MemberInfo[];
│     deck: CardInfo[];
│     currentIndex: number;
│     phase: SessionPhase;
│     myProgress: number;
│     matchResult: MatchResult | null;
│   }
│   Actions: {
│     createSession(mode: Mode, filters: Filters): Promise<void>;
│     joinSession(code: string): Promise<void>;
│     startSession(): Promise<void>;
│     leaveSession(): void;
│     recordSwipe(itemId: string, direction: Direction): void;
│     setPhase(phase: SessionPhase): void;
│   }
│
├── swipeStore.ts                     # Swipe-specific state
│   State: {
│     pendingSwipes: SwipeData[];     # Offline queue
│     superLikeUsed: boolean;
│     swipeHistory: SwipeData[];
│   }
│   Actions: {
│     queueSwipe(swipe: SwipeData): void;
│     flushSwipes(): Promise<void>;
│     useSuperLike(): void;
│   }
│
├── realtimeStore.ts                  # Socket.IO connection state
│   State: {
│     connected: boolean;
│     latency: number;
│     memberPresence: Map<string, PresenceStatus>;
│   }
│   Actions: {
│     connect(): void;
│     disconnect(): void;
│     joinRoom(sessionId: string): void;
│     leaveRoom(sessionId: string): void;
│   }
│
└── uiStore.ts                        # UI state
    State: {
      isLoading: boolean;
      error: Error | null;
      toast: ToastData | null;
      onboardingStep: number;
    }
    Actions: {
      setLoading(loading: boolean): void;
      setError(error: Error | null): void;
      showToast(toast: ToastData): void;
      nextOnboardingStep(): void;
    }
```

---

## 8. Analytics Event Schema

```typescript
// src/analytics/events.ts

/**
 * All analytics events with their payload schemas
 * Events are append-only and immutable
 */

// Base event structure
interface BaseEvent {
  eventType: string;
  eventVersion: number;
  sessionId?: string;
  userId?: string;
  timestamp: Date;
  clientTimestamp?: Date;
  deviceInfo?: DeviceInfo;
}

interface DeviceInfo {
  platform: 'ios' | 'android' | 'web';
  osVersion?: string;
  appVersion?: string;
  liffVersion?: string;
  screenWidth: number;
  screenHeight: number;
  locale?: string;
}

// ============================================
// EVENT DEFINITIONS
// ============================================

// --- App Lifecycle ---

interface AppOpenEvent extends BaseEvent {
  eventType: 'app_open';
  eventVersion: 1;
  payload: {
    entryPoint: 'direct' | 'invite_link' | 'notification';
    inviteCode?: string;
    referrer?: string;
  };
}

interface AppCloseEvent extends BaseEvent {
  eventType: 'app_close';
  eventVersion: 1;
  payload: {
    sessionDurationMs: number;
    screenOnClose: string;
  };
}

// --- Onboarding ---

interface OnboardingStartEvent extends BaseEvent {
  eventType: 'onboarding_start';
  eventVersion: 1;
  payload: {
    isReturningUser: boolean;
  };
}

interface OnboardingStepEvent extends BaseEvent {
  eventType: 'onboarding_step';
  eventVersion: 1;
  payload: {
    step: number;
    stepName: string;
    action: 'view' | 'complete' | 'skip';
    timeOnStepMs?: number;
  };
}

interface OnboardingCompleteEvent extends BaseEvent {
  eventType: 'onboarding_complete';
  eventVersion: 1;
  payload: {
    totalTimeMs: number;
    stepsCompleted: number;
    skipped: boolean;
  };
}

// --- Session Lifecycle ---

interface SessionCreateEvent extends BaseEvent {
  eventType: 'session_create';
  eventVersion: 1;
  payload: {
    mode: 'solo' | 'group';
    filters: {
      cuisineCount: number;
      priceRange: [number, number];
      maxDistance: number;
      hasLocation: boolean;
    };
  };
}

interface SessionJoinEvent extends BaseEvent {
  eventType: 'session_join';
  eventVersion: 1;
  payload: {
    joinMethod: 'code' | 'link' | 'qr';
    memberNumber: number;  // Which member number they are (2-5)
    timeSinceCreationMs: number;
  };
}

interface SessionStartEvent extends BaseEvent {
  eventType: 'session_start';
  eventVersion: 1;
  payload: {
    memberCount: number;
    deckSize: number;
    waitTimeMs: number;  // Time from creation to start
  };
}

interface SessionEndEvent extends BaseEvent {
  eventType: 'session_end';
  eventVersion: 1;
  payload: {
    endReason: 'completed' | 'cancelled' | 'expired' | 'abandoned';
    phase: string;
    memberCount: number;
    activeMemberCount: number;
    totalSwipes: number;
  };
}

// --- Invite ---

interface InviteSentEvent extends BaseEvent {
  eventType: 'invite_sent';
  eventVersion: 1;
  payload: {
    method: 'line_share' | 'copy_link' | 'copy_code' | 'qr_show';
  };
}

// --- Swipe ---

interface SwipeEvent extends BaseEvent {
  eventType: 'swipe';
  eventVersion: 1;
  payload: {
    itemId: string;
    itemType: 'menu' | 'restaurant';
    direction: 'left' | 'right' | 'up';
    method: 'gesture' | 'button';
    cardIndex: number;
    totalCards: number;
    viewDurationMs: number;  // Time spent looking at card before swipe
    phase: string;
  };
}

interface SuperLikeEvent extends BaseEvent {
  eventType: 'super_like';
  eventVersion: 1;
  payload: {
    itemId: string;
    itemType: 'menu' | 'restaurant';
    cardIndex: number;
    phase: string;
  };
}

// --- Match & Decision ---

interface MatchFoundEvent extends BaseEvent {
  eventType: 'match_found';
  eventVersion: 1;
  payload: {
    matchType: 'strong' | 'weak' | 'tie' | 'super';
    itemId: string;
    itemType: 'menu' | 'restaurant';
    confidence: number;
    phase: string;
    swipeCount: number;  // How many swipes to reach match
    isEarlyMatch: boolean;  // Matched before all cards swiped
  };
}

interface DecisionMadeEvent extends BaseEvent {
  eventType: 'decision_made';
  eventVersion: 1;
  payload: {
    menuId: string;
    menuName: string;
    restaurantId: string;
    restaurantName: string;
    method: 'unanimous' | 'majority' | 'super_like' | 'tiebreaker' | 'timeout';
    confidence: number;
    timeToDecisionMs: number;
    memberCount: number;
    totalSwipes: number;
  };
}

interface NoMatchEvent extends BaseEvent {
  eventType: 'no_match';
  eventVersion: 1;
  payload: {
    phase: string;
    topItemIds: string[];
    memberCount: number;
    totalSwipes: number;
  };
}

// --- Result Actions ---

interface ResultViewEvent extends BaseEvent {
  eventType: 'result_view';
  eventVersion: 1;
  payload: {
    viewDurationMs?: number;
  };
}

interface ResultShareEvent extends BaseEvent {
  eventType: 'result_share';
  eventVersion: 1;
  payload: {
    method: 'line_share' | 'copy';
  };
}

interface MapOpenEvent extends BaseEvent {
  eventType: 'map_open';
  eventVersion: 1;
  payload: {
    restaurantId: string;
    mapProvider: 'google' | 'apple' | 'line';
  };
}

interface SessionRestartEvent extends BaseEvent {
  eventType: 'session_restart';
  eventVersion: 1;
  payload: {
    previousSessionId: string;
    keepFilters: boolean;
    keepMembers: boolean;
  };
}

// --- Member Activity ---

interface MemberIdleEvent extends BaseEvent {
  eventType: 'member_idle';
  eventVersion: 1;
  payload: {
    idleUserId: string;
    idleDurationMs: number;
    phase: string;
  };
}

interface MemberRemovedEvent extends BaseEvent {
  eventType: 'member_removed';
  eventVersion: 1;
  payload: {
    removedUserId: string;
    reason: 'idle_timeout' | 'left' | 'kicked';
    phase: string;
  };
}

// --- Error & Performance ---

interface ErrorEvent extends BaseEvent {
  eventType: 'error';
  eventVersion: 1;
  payload: {
    errorCode: string;
    errorMessage: string;
    errorStack?: string;
    context: string;  // Screen or action where error occurred
  };
}

interface PerformanceEvent extends BaseEvent {
  eventType: 'performance';
  eventVersion: 1;
  payload: {
    metric: 'ttfb' | 'fcp' | 'lcp' | 'fid' | 'cls' | 'swipe_latency' | 'sync_latency';
    valueMs: number;
    screen?: string;
  };
}

// ============================================
// EVENT UNION TYPE
// ============================================

type AnalyticsEvent =
  | AppOpenEvent
  | AppCloseEvent
  | OnboardingStartEvent
  | OnboardingStepEvent
  | OnboardingCompleteEvent
  | SessionCreateEvent
  | SessionJoinEvent
  | SessionStartEvent
  | SessionEndEvent
  | InviteSentEvent
  | SwipeEvent
  | SuperLikeEvent
  | MatchFoundEvent
  | DecisionMadeEvent
  | NoMatchEvent
  | ResultViewEvent
  | ResultShareEvent
  | MapOpenEvent
  | SessionRestartEvent
  | MemberIdleEvent
  | MemberRemovedEvent
  | ErrorEvent
  | PerformanceEvent;
```

```typescript
// src/analytics/tracker.ts

class AnalyticsTracker {
  private queue: AnalyticsEvent[] = [];
  private flushInterval: number = 5000; // 5 seconds
  private maxQueueSize: number = 50;

  constructor(private apiClient: ApiClient) {
    this.startAutoFlush();
  }

  track<T extends AnalyticsEvent>(event: Omit<T, 'timestamp' | 'deviceInfo'>): void {
    const fullEvent: AnalyticsEvent = {
      ...event,
      timestamp: new Date(),
      clientTimestamp: new Date(),
      deviceInfo: this.getDeviceInfo(),
    } as AnalyticsEvent;

    this.queue.push(fullEvent);

    if (this.queue.length >= this.maxQueueSize) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      await this.apiClient.post('/analytics/events/batch', { events });
    } catch (error) {
      // Re-queue failed events
      this.queue = [...events, ...this.queue].slice(0, this.maxQueueSize * 2);
    }
  }

  private startAutoFlush(): void {
    setInterval(() => this.flush(), this.flushInterval);

    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') this.flush();
      });
    }
  }

  private getDeviceInfo(): DeviceInfo {
    if (typeof window === 'undefined') return {} as DeviceInfo;

    return {
      platform: this.detectPlatform(),
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      locale: navigator.language,
    };
  }

  private detectPlatform(): 'ios' | 'android' | 'web' {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    return 'web';
  }
}
```

---

## 9. MVP Development Plan (14-Day Sprint)

```
═══════════════════════════════════════════════════════════════════════════════
                         TOAST! MVP - 14 DAY SPRINT PLAN
═══════════════════════════════════════════════════════════════════════════════

TEAM ASSUMPTION: 2 Full-Stack Engineers + 1 Designer (part-time)

───────────────────────────────────────────────────────────────────────────────
PHASE 1: FOUNDATION (Days 1-3)
───────────────────────────────────────────────────────────────────────────────

DAY 1 - Project Setup & Infrastructure
┌─────────────────────────────────────────────────────────────────────────────┐
│ BACKEND                              │ FRONTEND                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ □ Initialize Node.js + Fastify       │ □ Initialize Next.js 14 (App Router)│
│ □ TypeScript configuration           │ □ TypeScript + Tailwind setup       │
│ □ Prisma setup + schema              │ □ shadcn/ui components install      │
│ □ PostgreSQL + Redis Docker setup    │ □ Zustand store structure           │
│ □ Environment configuration          │ □ LIFF SDK integration scaffold     │
│ □ Basic folder structure             │ □ Basic routing structure           │
└─────────────────────────────────────────────────────────────────────────────┘
│ DELIVERABLE: Both repos initialized, can run locally, DB migrations work    │
└─────────────────────────────────────────────────────────────────────────────┘

DAY 2 - Authentication System
┌─────────────────────────────────────────────────────────────────────────────┐
│ BACKEND                              │ FRONTEND                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ □ LINE token verification service    │ □ LIFF initialization               │
│ □ JWT generation/validation          │ □ Auth flow implementation          │
│ □ Auth middleware                    │ □ Auth store (Zustand)              │
│ □ User creation/retrieval            │ □ Protected route wrapper           │
│ □ POST /auth/line endpoint           │ □ Token storage (memory/secure)     │
│ □ GET /users/me endpoint             │ □ Auto-refresh logic                │
└─────────────────────────────────────────────────────────────────────────────┘
│ DELIVERABLE: User can log in via LINE, JWT issued, profile retrieved       │
└─────────────────────────────────────────────────────────────────────────────┘

DAY 3 - Core Data Models & Seed Data
┌─────────────────────────────────────────────────────────────────────────────┐
│ BACKEND                              │ FRONTEND                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ □ Complete Prisma schema             │ □ API client setup (fetch wrapper)  │
│ □ Database migrations                │ □ Type definitions from backend     │
│ □ Seed script: 50 menus              │ □ React Query setup                 │
│ □ Seed script: 30 restaurants        │ □ Error handling utilities          │
│ □ Menu-Restaurant mappings           │ □ Loading state components          │
│ □ GET /menus endpoint                │ □ Basic debug/test page             │
└─────────────────────────────────────────────────────────────────────────────┘
│ DELIVERABLE: Database populated, menus/restaurants queryable               │
└─────────────────────────────────────────────────────────────────────────────┘

───────────────────────────────────────────────────────────────────────────────
PHASE 2: SESSION MANAGEMENT (Days 4-5)
───────────────────────────────────────────────────────────────────────────────

DAY 4 - Session CRUD & Room State
┌─────────────────────────────────────────────────────────────────────────────┐
│ BACKEND                              │ FRONTEND                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ □ Redis connection + utilities       │ □ Home screen (Solo/Group choice)   │
│ □ Session creation logic             │ □ Create session screen             │
│ □ Invite code generation             │ □ Join session screen               │
│ □ POST /sessions endpoint            │ □ Session store (Zustand)           │
│ □ POST /sessions/join endpoint       │ □ Filter selection UI               │
│ □ GET /sessions/:id endpoint         │ □ Cuisine/Price/Distance pickers    │
│ □ Room state manager (Redis)         │                                      │
└─────────────────────────────────────────────────────────────────────────────┘
│ DELIVERABLE: Sessions can be created, joined via code, state persisted     │
└─────────────────────────────────────────────────────────────────────────────┘

DAY 5 - Waiting Room & Member Management
┌─────────────────────────────────────────────────────────────────────────────┐
│ BACKEND                              │ FRONTEND                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ □ Member add/remove logic            │ □ Waiting room screen               │
│ □ Session start logic                │ □ Member list component             │
│ □ Deck generation (filtered menus)   │ □ Invite share component            │
│ □ POST /sessions/:id/start           │ □ Copy code / LINE share            │
│ □ POST /sessions/:id/leave           │ □ Start button (owner only)         │
│ □ Member status tracking             │ □ Member avatars + status           │
└─────────────────────────────────────────────────────────────────────────────┘
│ DELIVERABLE: Full lobby flow working, deck generated on start              │
└─────────────────────────────────────────────────────────────────────────────┘

───────────────────────────────────────────────────────────────────────────────
PHASE 3: REALTIME INFRASTRUCTURE (Days 6-7)
───────────────────────────────────────────────────────────────────────────────

DAY 6 - Socket.IO Setup & Room Events
┌─────────────────────────────────────────────────────────────────────────────┐
│ BACKEND                              │ FRONTEND                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ □ Socket.IO server setup             │ □ Socket.IO client setup            │
│ □ Redis adapter for scaling          │ □ Realtime store (Zustand)          │
│ □ Auth middleware (socket)           │ □ Connection management             │
│ □ Room join/leave handlers           │ □ Reconnection logic                │
│ □ Member presence tracking           │ □ Connection status indicator       │
│ □ room:state event                   │ □ Handle room:state updates         │
│ □ member:joined/left events          │ □ Real-time member updates          │
└─────────────────────────────────────────────────────────────────────────────┘
│ DELIVERABLE: Members see each other join/leave in real-time                │
└─────────────────────────────────────────────────────────────────────────────┘

DAY 7 - Swipe Sync & Progress Tracking
┌─────────────────────────────────────────────────────────────────────────────┐
│ BACKEND                              │ FRONTEND                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ □ swipe:submit handler               │ □ Swipe event emission              │
│ □ Swipe persistence (Redis + PG)     │ □ swipe:ack handling                │
│ □ Progress calculation               │ □ Progress bar component            │
│ □ swipe:progress broadcast           │ □ Member progress display           │
│ □ Idle detection timer               │ □ Handle disconnection gracefully   │
│ □ member:idle event                  │ □ Offline queue (Zustand)           │
└─────────────────────────────────────────────────────────────────────────────┘
│ DELIVERABLE: Swipes sync across clients, progress visible to all           │
└─────────────────────────────────────────────────────────────────────────────┘

───────────────────────────────────────────────────────────────────────────────
PHASE 4: SWIPE UI & DECISION ENGINE (Days 8-10)
───────────────────────────────────────────────────────────────────────────────

DAY 8 - Swipe Card Component
┌─────────────────────────────────────────────────────────────────────────────┐
│ FRONTEND (Primary Focus)                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ □ SwipeCard component with gestures                                         │
│ □ Pan gesture detection (touch + mouse)                                     │
│ □ Direction threshold logic                                                 │
│ □ Spring animation on release                                               │
│ □ Visual feedback (tilt, opacity, icons)                                    │
│ □ SwipeDeck component (card stack)                                          │
│ □ Card preloading (images)                                                  │
│ □ SwipeControls (button fallback)                                           │
│ □ Super Like button with limit                                              │
└─────────────────────────────────────────────────────────────────────────────┘
│ DELIVERABLE: Smooth, responsive swipe UI matching Tinder UX quality        │
└─────────────────────────────────────────────────────────────────────────────┘

DAY 9 - Decision Engine Implementation
┌─────────────────────────────────────────────────────────────────────────────┐
│ BACKEND (Primary Focus)                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ □ DecisionEngine class                                                      │
│ □ Vote aggregation logic                                                    │
│ □ Score calculation (with super like weight)                                │
│ □ Match type determination                                                  │
│ □ Tie-breaker logic (deterministic random)                                  │
│ □ Early match detection                                                     │
│ □ match:found event emission                                                │
│ □ match:tie event emission                                                  │
│ □ Phase transition logic                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
│ DELIVERABLE: Decision engine correctly determines matches in all scenarios │
└─────────────────────────────────────────────────────────────────────────────┘

DAY 10 - Phase Transitions & Restaurant Selection
┌─────────────────────────────────────────────────────────────────────────────┐
│ BACKEND                              │ FRONTEND                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ □ Menu → Restaurant phase logic      │ □ Menu result screen                 │
│ □ Restaurant deck generation         │ □ Matched menu display               │
│ □ GET /menus/:id/restaurants         │ □ Restaurant card variant            │
│ □ Final decision persistence         │ □ Phase transition animations        │
│ □ Decision model creation            │ □ Continue to restaurant button      │
│ □ phase:transition event             │ □ Handle phase:transition            │
└─────────────────────────────────────────────────────────────────────────────┘
│ DELIVERABLE: Full flow from menu swipe → restaurant selection              │
└─────────────────────────────────────────────────────────────────────────────┘

───────────────────────────────────────────────────────────────────────────────
PHASE 5: RESULTS & POLISH (Days 11-12)
───────────────────────────────────────────────────────────────────────────────

DAY 11 - Result Screen & Actions
┌─────────────────────────────────────────────────────────────────────────────┐
│ BACKEND                              │ FRONTEND                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ □ GET /sessions/:id/result           │ □ Final result screen                │
│ □ POST /sessions/:id/restart         │ □ Winning menu + restaurant card     │
│ □ Vote breakdown formatting          │ □ Vote breakdown component           │
│ □ Time to decision calculation       │ □ Confidence meter                   │
│                                      │ □ Open in Maps integration           │
│                                      │ □ LINE Share integration             │
│                                      │ □ Restart button                     │
└─────────────────────────────────────────────────────────────────────────────┘
│ DELIVERABLE: Complete result screen with all actions working               │
└─────────────────────────────────────────────────────────────────────────────┘

DAY 12 - Onboarding & Error States
┌─────────────────────────────────────────────────────────────────────────────┐
│ BACKEND                              │ FRONTEND                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ □ PATCH /users/me/onboarding         │ □ 3-step onboarding flow             │
│ □ Onboarding completion tracking     │ □ Skip functionality                 │
│ □ Error response standardization     │ □ Resume mid-onboarding              │
│                                      │ □ Error boundary components          │
│                                      │ □ Network error handling             │
│                                      │ □ Empty states                       │
│                                      │ □ Loading skeletons                  │
└─────────────────────────────────────────────────────────────────────────────┘
│ DELIVERABLE: Smooth onboarding, graceful error handling                    │
└─────────────────────────────────────────────────────────────────────────────┘

───────────────────────────────────────────────────────────────────────────────
PHASE 6: ANALYTICS & TESTING (Day 13)
───────────────────────────────────────────────────────────────────────────────

DAY 13 - Analytics & Integration Testing
┌─────────────────────────────────────────────────────────────────────────────┐
│ BACKEND                              │ FRONTEND                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ □ Analytics event ingestion          │ □ Analytics tracker integration      │
│ □ POST /analytics/events/batch       │ □ Event tracking at key points       │
│ □ Event validation                   │ □ Performance metrics (Web Vitals)   │
│ □ Integration tests (API)            │ □ E2E test: Solo flow                │
│ □ Integration tests (Socket.IO)      │ □ E2E test: Group flow (2 users)     │
│ □ Decision engine unit tests         │ □ Swipe gesture tests                │
└─────────────────────────────────────────────────────────────────────────────┘
│ DELIVERABLE: Analytics tracking all MVP events, critical paths tested      │
└─────────────────────────────────────────────────────────────────────────────┘

───────────────────────────────────────────────────────────────────────────────
PHASE 7: DEPLOYMENT & LAUNCH (Day 14)
───────────────────────────────────────────────────────────────────────────────

DAY 14 - Deployment & Final QA
┌─────────────────────────────────────────────────────────────────────────────┐
│ INFRASTRUCTURE                       │ QA & LAUNCH                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ □ Production environment setup       │ □ LINE LIFF app registration         │
│ □ Backend deployment (Railway/Render)│ □ Full flow QA (iOS)                 │
│ □ Frontend deployment (Vercel)       │ □ Full flow QA (Android)             │
│ □ PostgreSQL production (Supabase)   │ □ Performance testing                │
│ □ Redis production (Upstash)         │ □ Edge case testing                  │
│ □ Environment variables              │ □ Bug fixes                          │
│ □ SSL/Domain configuration           │ □ Soft launch to test group          │
│ □ Monitoring setup (basic)           │ □ Document known issues              │
└─────────────────────────────────────────────────────────────────────────────┘
│ DELIVERABLE: MVP live and accessible via LINE                              │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
                              RISK MITIGATION
═══════════════════════════════════════════════════════════════════════════════

HIGH RISK ITEMS (Address Early):
1. LIFF SDK integration quirks → Day 2 focus
2. Swipe gesture performance → Day 8 dedicated time
3. Real-time sync reliability → Days 6-7 thorough testing
4. LINE share API limitations → Research on Day 5

SCOPE CUTS IF BEHIND:
- Onboarding can be 1 screen instead of 3
- Confidence meter can be simplified
- Vote breakdown can be hidden initially
- Super Like can be removed (simplify to like/dislike)

MUST-HAVE FOR MVP:
✓ LINE login
✓ Create/join group session
✓ Swipe menus
✓ Real-time sync
✓ Match detection
✓ Restaurant selection
✓ Result with map link

═══════════════════════════════════════════════════════════════════════════════
                           DAILY STANDUP CHECKPOINTS
═══════════════════════════════════════════════════════════════════════════════

End of Day 3:  Can log in, see menus from DB
End of Day 5:  Can create session, share invite, others can join
End of Day 7:  Real-time presence working, swipes sync
End of Day 10: Full swipe flow, decisions being made
End of Day 12: Complete user flow polished
End of Day 14: LIVE 🚀

═══════════════════════════════════════════════════════════════════════════════
```

---

## Project Structure

```
toast/
├── apps/
│   ├── web/                          # Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   └── login/
│   │   │   ├── (main)/
│   │   │   │   ├── page.tsx          # Home
│   │   │   │   ├── session/
│   │   │   │   │   ├── create/
│   │   │   │   │   ├── join/
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── waiting/
│   │   │   │   │       ├── swipe/
│   │   │   │   │       └── result/
│   │   │   │   └── profile/
│   │   │   ├── onboarding/
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   ├── stores/
│   │   ├── hooks/
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   ├── socket.ts
│   │   │   ├── liff.ts
│   │   │   └── analytics.ts
│   │   └── types/
│   │
│   └── api/                          # Fastify backend
│       ├── src/
│       │   ├── routes/
│       │   │   ├── auth.ts
│       │   │   ├── users.ts
│       │   │   ├── sessions.ts
│       │   │   ├── menus.ts
│       │   │   ├── restaurants.ts
│       │   │   └── analytics.ts
│       │   ├── socket/
│       │   │   ├── index.ts
│       │   │   ├── handlers/
│       │   │   └── middleware/
│       │   ├── engine/
│       │   │   ├── decision-engine.ts
│       │   │   └── session-flow.ts
│       │   ├── services/
│       │   │   ├── line.ts
│       │   │   ├── auth.ts
│       │   │   └── analytics.ts
│       │   ├── redis/
│       │   │   ├── client.ts
│       │   │   ├── keys.ts
│       │   │   └── room-state.ts
│       │   ├── middleware/
│       │   ├── utils/
│       │   └── types/
│       └── prisma/
│           ├── schema.prisma
│           ├── migrations/
│           └── seed.ts
│
├── packages/
│   └── shared/                       # Shared types
│       └── types/
│
├── docker-compose.yml
├── turbo.json                        # Turborepo config
└── package.json
```