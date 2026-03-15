import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";

interface CampaignBannerData {
  id: string;
  restaurantId: number;
  restaurantName: string;
  restaurantImage: string;
  title: string;
  dealType: "percentage" | "bogo" | "freeItem" | "fixedAmount";
  dealValue: string;
  description: string;
  endDate: string;
  accentColor?: string;
}

export function getDealLabel(dealType: string, dealValue: string) {
  switch (dealType) {
    case "percentage": return `${dealValue}% off`;
    case "bogo": return "Buy 1 Get 1";
    case "freeItem": return `Free ${dealValue}`;
    case "fixedAmount": return `฿${dealValue} off`;
    default: return dealValue;
  }
}

function getDaysLeft(endDate: string) {
  const end = new Date(endDate);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return "Ends today";
  if (diff === 1) return "1 day left";
  if (diff <= 7) return `${diff} days left`;
  return `${Math.ceil(diff / 7)} weeks left`;
}

export function HomeCampaignBanner() {
  const [, navigate] = useLocation();
  const { data: apiCampaigns } = useQuery<CampaignBannerData[]>({
    queryKey: ["/api/campaigns/active"],
    queryFn: async () => {
      const res = await fetch("/api/campaigns/active");
      if (!res.ok) return [];
      return res.json();
    },
  });
  const campaigns = apiCampaigns ?? [];
  if (campaigns.length === 0) return null;

  return (
    <div className="mb-2" data-testid="home-campaign-banner">
      <div className="px-6 mb-2.5 flex items-center justify-between">
        <h3 className="text-[15px] font-bold text-foreground">Deals near you</h3>
        <button
          onClick={() => navigate("/swipe?mode=campaigns")}
          className="text-[12px] font-semibold text-muted-foreground/70 active:opacity-60"
          data-testid="link-see-all-campaigns"
        >
          See all
        </button>
      </div>

      <div
        className="flex gap-3 overflow-x-auto hide-scrollbar pl-6 pr-4 pb-1"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        {campaigns.map((campaign, idx) => (
          <motion.div
            key={campaign.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            className="relative flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer active:scale-[0.97] transition-transform duration-200"
            style={{ width: 240, height: 105 }}
            onClick={() => navigate(`/campaign/${campaign.id}`)}
            data-testid={`campaign-card-${campaign.id}`}
          >
            <img
              src={campaign.restaurantImage}
              alt={campaign.restaurantName}
              className="absolute inset-0 w-full h-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/5" />

            <div className="relative z-10 h-full flex flex-col justify-end p-3.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-white/50 mb-0.5 line-clamp-1">
                {campaign.restaurantName}
              </span>
              <h4 className="text-[13px] font-bold text-white leading-tight mb-1.5 line-clamp-1">
                {campaign.title}
              </h4>
              <div className="flex items-center justify-between">
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: campaign.accentColor || "#1E293B" }}
                  data-testid={`campaign-deal-${campaign.id}`}
                >
                  {getDealLabel(campaign.dealType, campaign.dealValue)}
                </span>
                <span className="text-[9px] text-white/50 font-medium">
                  {getDaysLeft(campaign.endDate)}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

interface RestaurantCampaignBannerProps {
  restaurantId: number;
}

export function RestaurantCampaignBanner({ restaurantId }: RestaurantCampaignBannerProps) {
  const [, navigate] = useLocation();
  const { data: apiCampaigns } = useQuery<CampaignBannerData[]>({
    queryKey: ["/api/campaigns/active"],
    queryFn: async () => {
      const res = await fetch("/api/campaigns/active");
      if (!res.ok) return [];
      return res.json();
    },
  });
  const apiMatch = apiCampaigns?.find((c) => Number(c.restaurantId) === restaurantId);
  const campaign = apiMatch ?? null;
  if (!campaign) return null;

  return (
    <div className="mb-6" data-testid="restaurant-campaign-banner">
      <h2 className="font-bold text-[15px] mb-3 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-500" />
        Special Offer
      </h2>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative rounded-2xl overflow-hidden border border-gray-100/80 cursor-pointer active:scale-[0.98] transition-transform duration-200"
        style={{ boxShadow: "0 2px 12px -4px rgba(0,0,0,0.08)" }}
        onClick={() => navigate(`/campaign/${campaign.id}`)}
        data-testid={`restaurant-campaign-${campaign.id}`}
      >
        <div className="relative h-28 overflow-hidden">
          <img
            src={campaign.restaurantImage}
            alt=""
            className="w-full h-full object-cover"
            style={{ filter: "brightness(0.85)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          <div className="absolute bottom-3 left-4 right-4 z-10 flex items-end justify-between">
            <h3 className="text-[15px] font-bold text-white leading-tight">
              {campaign.title}
            </h3>
            <span className="text-[10px] text-white/70 font-medium flex-shrink-0 ml-2">View deal →</span>
          </div>
        </div>

        <div className="bg-white px-4 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 mr-3">
              <p className="text-[13px] text-foreground/70 leading-snug line-clamp-2">
                {campaign.description}
              </p>
            </div>

            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-bold text-white bg-foreground"
                data-testid={`restaurant-deal-${campaign.id}`}
              >
                {getDealLabel(campaign.dealType, campaign.dealValue)}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">
                {getDaysLeft(campaign.endDate)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
