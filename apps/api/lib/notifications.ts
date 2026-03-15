import { storage } from "../storage";
import { emitNotificationToOwner } from "../socket";
import type { InsertNotification } from "@shared/schema";

/**
 * Notification service for creating owner notifications based on events.
 * Call these methods when events occur that should notify restaurant owners.
 */

export async function notifyReviewReceived(
  ownerId: number,
  restaurantId: number,
  restaurantName: string,
  authorName: string,
  rating: number,
  reviewText: string
): Promise<void> {
  const notification: InsertNotification = {
    ownerId,
    type: "review",
    title: "New Review",
    message: `${authorName} left a ${rating}-star review: "${reviewText.slice(0, 50)}${reviewText.length > 50 ? "..." : ""}"`,
    read: false,
    metadata: { restaurantId, restaurantName, authorName, rating, reviewText },
  };
  const created = await storage.createNotification(notification);
  emitNotificationToOwner(ownerId, created);
}

export async function notifyReviewReplyReceived(
  ownerId: number,
  restaurantId: number,
  restaurantName: string,
  reviewAuthor: string
): Promise<void> {
  const notification: InsertNotification = {
    ownerId,
    type: "review",
    title: "Review Reply Added",
    message: `You replied to ${reviewAuthor}'s review on ${restaurantName}`,
    read: false,
    metadata: { restaurantId, restaurantName, reviewAuthor },
  };
  const created = await storage.createNotification(notification);
  emitNotificationToOwner(ownerId, created);
}

export async function notifyRestaurantSaved(
  ownerId: number,
  restaurantId: number,
  restaurantName: string,
  totalSaves: number
): Promise<void> {
  // Only notify on milestone saves (5, 10, 25, 50, 100, etc.)
  const milestones = [5, 10, 25, 50, 100, 200, 500, 1000];
  if (!milestones.includes(totalSaves)) return;

  const notification: InsertNotification = {
    ownerId,
    type: "milestone",
    title: "Milestone Reached",
    message: `Your restaurant "${restaurantName}" has been saved by ${totalSaves} users!`,
    read: false,
    metadata: { restaurantId, restaurantName, totalSaves, milestone: true },
  };
  const created = await storage.createNotification(notification);
  emitNotificationToOwner(ownerId, created);
}

export async function notifyDeliveryClick(
  ownerId: number,
  restaurantId: number,
  restaurantName: string,
  platform: string,
  dishName?: string
): Promise<void> {
  const notification: InsertNotification = {
    ownerId,
    type: "delivery",
    title: "Delivery Order Click",
    message: dishName
      ? `Someone clicked to order "${dishName}" via ${platform}`
      : `Someone clicked to order from your restaurant via ${platform}`,
    read: false,
    metadata: { restaurantId, restaurantName, platform, dishName },
  };
  const created = await storage.createNotification(notification);
  emitNotificationToOwner(ownerId, created);
}

export async function notifyCampaignMilestone(
  ownerId: number,
  restaurantId: number,
  restaurantName: string,
  campaignName: string,
  impressions: number,
  clicks: number
): Promise<void> {
  const notification: InsertNotification = {
    ownerId,
    type: "campaign",
    title: "Campaign Update",
    message: `Your "${campaignName}" promotion reached ${impressions.toLocaleString()} impressions with ${clicks} clicks!`,
    read: false,
    metadata: { restaurantId, restaurantName, campaignName, impressions, clicks },
  };
  const created = await storage.createNotification(notification);
  emitNotificationToOwner(ownerId, created);
}

export async function notifyCampaignEnded(
  ownerId: number,
  restaurantId: number,
  restaurantName: string,
  campaignName: string,
  finalImpressions: number,
  finalClicks: number
): Promise<void> {
  const notification: InsertNotification = {
    ownerId,
    type: "campaign",
    title: "Campaign Ended",
    message: `Your "${campaignName}" campaign has ended. Final results: ${finalImpressions.toLocaleString()} impressions, ${finalClicks} clicks.`,
    read: false,
    metadata: { restaurantId, restaurantName, campaignName, finalImpressions, finalClicks },
  };
  const created = await storage.createNotification(notification);
  emitNotificationToOwner(ownerId, created);
}

export async function notifyVerificationStatus(
  ownerId: number,
  status: "approved" | "rejected" | "pending",
  reviewNotes?: string
): Promise<void> {
  const title = status === "approved" 
    ? "Verification Approved" 
    : status === "rejected" 
      ? "Verification Rejected" 
      : "Verification Pending";
  
  const message = status === "approved"
    ? "Your business verification has been approved! You now have the Verified badge."
    : status === "rejected"
      ? `Your verification was rejected. ${reviewNotes || "Please check your documents and try again."}`
      : "Your business verification is pending review. We'll notify you once it's complete.";

  const notification: InsertNotification = {
    ownerId,
    type: "verification",
    title,
    message,
    read: false,
    metadata: { status, reviewNotes },
  };
  const created = await storage.createNotification(notification);
  emitNotificationToOwner(ownerId, created);
}

export async function notifyPerformanceTip(
  ownerId: number,
  tipType: "photos" | "hours" | "menu" | "promotion",
  restaurantName: string
): Promise<void> {
  const tips: Record<string, { title: string; message: string }> = {
    photos: {
      title: "Performance Tip",
      message: `Add more photos to "${restaurantName}" — restaurants with 5+ photos get 40% more views.`,
    },
    hours: {
      title: "Performance Tip", 
      message: `Update your opening hours for "${restaurantName}" — many users search outside your listed hours.`,
    },
    menu: {
      title: "Performance Tip",
      message: `Add menu items to "${restaurantName}" — detailed menus increase orders by 25%.`,
    },
    promotion: {
      title: "Performance Tip",
      message: `Create a promotion for "${restaurantName}" — restaurants with active promotions get 2x more views.`,
    },
  };

  const tip = tips[tipType];
  if (!tip) return;

  const notification: InsertNotification = {
    ownerId,
    type: "tip",
    title: tip.title,
    message: tip.message,
    read: false,
    metadata: { tipType, restaurantName },
  };
  const created = await storage.createNotification(notification);
  emitNotificationToOwner(ownerId, created);
}

export async function notifySwipeMilestone(
  ownerId: number,
  restaurantId: number,
  restaurantName: string,
  totalSwipes: number
): Promise<void> {
  // Only notify on milestone swipes (20, 50, 100, 200, 500, 1000, etc.)
  const milestones = [20, 50, 100, 200, 500, 1000, 2000, 5000];
  if (!milestones.includes(totalSwipes)) return;

  const notification: InsertNotification = {
    ownerId,
    type: "milestone",
    title: "Popular Restaurant!",
    message: `${totalSwipes} users have swiped right on "${restaurantName}"!`,
    read: false,
    metadata: { restaurantId, restaurantName, totalSwipes, milestone: true },
  };
  const created = await storage.createNotification(notification);
  emitNotificationToOwner(ownerId, created);
}
