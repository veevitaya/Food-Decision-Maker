import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import WaitingRoom from "@/pages/WaitingRoom";
import CampaignDetail from "@/pages/CampaignDetail";
import GroupMenuRestaurants from "@/pages/GroupMenuRestaurants";

// Mock wouter with campaign route match for camp_1
vi.mock("wouter", () => ({
  useLocation: () => ["/campaign/camp_1", vi.fn()],
  useRoute: (pattern: string) => {
    if (pattern === "/campaign/:id") return [true, { id: "camp_1" }];
    return [false, {}];
  },
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

// ── WaitingRoom - no session (default state) ──────────────────────────────────
describe("WaitingRoom (Group Session Lobby) - no session ID", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ members: [] }),
    });
  });

  it("renders without crashing", () => {
    const { container } = render(<WaitingRoom />, { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it("shows 'No session ID found' message when no session param", () => {
    render(<WaitingRoom />, { wrapper: createWrapper() });
    expect(screen.getByText(/No session ID found/i)).toBeInTheDocument();
  });

  it("shows 'Start New Group' button when no session param", () => {
    render(<WaitingRoom />, { wrapper: createWrapper() });
    expect(screen.getByTestId("button-new-group")).toBeInTheDocument();
  });

  it("'Start New Group' button is clickable", () => {
    render(<WaitingRoom />, { wrapper: createWrapper() });
    const btn = screen.getByTestId("button-new-group");
    fireEvent.click(btn);
    expect(btn).toBeInTheDocument();
  });

  it("renders bottom navigation", () => {
    render(<WaitingRoom />, { wrapper: createWrapper() });
    expect(screen.getByTestId("tab-explore")).toBeInTheDocument();
  });
});

// ── WaitingRoom - with session ID ─────────────────────────────────────────────
describe("WaitingRoom (Group Session Lobby) - with session ID", () => {
  beforeEach(() => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...window.location, search: "?session=ABC123" },
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ members: [], session: null }),
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...window.location, search: "" },
    });
  });

  it("renders waiting room page when session is provided", () => {
    render(<WaitingRoom />, { wrapper: createWrapper() });
    expect(document.querySelector('[data-testid="waiting-room-page"]')).toBeInTheDocument();
  });

  it("shows invite more button", () => {
    render(<WaitingRoom />, { wrapper: createWrapper() });
    expect(screen.getByTestId("button-invite-more")).toBeInTheDocument();
  });

  it("shows start swiping button", () => {
    render(<WaitingRoom />, { wrapper: createWrapper() });
    expect(screen.getByTestId("button-start-swiping")).toBeInTheDocument();
  });

  it("invite more button is clickable", () => {
    render(<WaitingRoom />, { wrapper: createWrapper() });
    const btn = screen.getByTestId("button-invite-more");
    fireEvent.click(btn);
    expect(btn).toBeInTheDocument();
  });

  it("start swiping button is clickable", () => {
    render(<WaitingRoom />, { wrapper: createWrapper() });
    const btn = screen.getByTestId("button-start-swiping");
    fireEvent.click(btn);
    expect(btn).toBeInTheDocument();
  });

  it("shows mascot image", () => {
    render(<WaitingRoom />, { wrapper: createWrapper() });
    const imgs = screen.getAllByRole("img");
    expect(imgs.length).toBeGreaterThan(0);
  });

  it("shows member count text", () => {
    render(<WaitingRoom />, { wrapper: createWrapper() });
    expect(screen.getByText(/joined/i)).toBeInTheDocument();
  });
});

// ── CampaignDetail ────────────────────────────────────────────────────────────
describe("CampaignDetail (Campaign/Deal Page)", () => {
  it("renders without crashing", () => {
    const { container } = render(<CampaignDetail />, { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it("renders campaign detail page container", () => {
    render(<CampaignDetail />, { wrapper: createWrapper() });
    expect(document.querySelector('[data-testid="campaign-detail-page"]')).toBeInTheDocument();
  });

  it("shows campaign title text element", () => {
    render(<CampaignDetail />, { wrapper: createWrapper() });
    expect(screen.getByTestId("text-campaign-title")).toBeInTheDocument();
  });

  it("shows 'Pizza Night Special' as the campaign title", () => {
    render(<CampaignDetail />, { wrapper: createWrapper() });
    expect(screen.getByText(/Pizza Night Special/i)).toBeInTheDocument();
  });

  it("shows restaurant name Peppina (may appear multiple times)", () => {
    render(<CampaignDetail />, { wrapper: createWrapper() });
    const peppinaElems = screen.getAllByText(/Peppina/i);
    expect(peppinaElems.length).toBeGreaterThan(0);
  });

  it("shows deal badge", () => {
    render(<CampaignDetail />, { wrapper: createWrapper() });
    expect(screen.getByTestId("text-deal-badge")).toBeInTheDocument();
  });

  it("shows back button", () => {
    render(<CampaignDetail />, { wrapper: createWrapper() });
    expect(screen.getByTestId("button-back-campaign")).toBeInTheDocument();
  });

  it("back button is clickable", () => {
    render(<CampaignDetail />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByTestId("button-back-campaign"));
    expect(screen.getByTestId("button-back-campaign")).toBeInTheDocument();
  });

  it("shows redeem button", () => {
    render(<CampaignDetail />, { wrapper: createWrapper() });
    expect(screen.getByTestId("button-redeem-deal")).toBeInTheDocument();
  });

  it("clicking redeem opens redemption overlay", () => {
    render(<CampaignDetail />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByTestId("button-redeem-deal"));
    expect(screen.getByTestId("redemption-overlay")).toBeInTheDocument();
  });

  it("redemption overlay shows a promo code", () => {
    render(<CampaignDetail />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByTestId("button-redeem-deal"));
    fireEvent.click(screen.getByTestId("tab-code"));
    expect(screen.getByTestId("text-redemption-code")).toBeInTheDocument();
  });

  it("code starts with 'TST-'", () => {
    render(<CampaignDetail />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByTestId("button-redeem-deal"));
    fireEvent.click(screen.getByTestId("tab-code"));
    const codeEl = screen.getByTestId("text-redemption-code");
    expect(codeEl.textContent).toMatch(/^TST-/);
  });

  it("copy button is present after switching to code tab", () => {
    render(<CampaignDetail />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByTestId("button-redeem-deal"));
    fireEvent.click(screen.getByTestId("tab-code"));
    expect(screen.getByTestId("button-copy-code")).toBeInTheDocument();
  });

  it("close button dismisses the overlay", () => {
    render(<CampaignDetail />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByTestId("button-redeem-deal"));
    expect(screen.getByTestId("redemption-overlay")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("button-close-redemption"));
    expect(screen.queryByTestId("redemption-overlay")).not.toBeInTheDocument();
  });

  it("renders bottom navigation", () => {
    render(<CampaignDetail />, { wrapper: createWrapper() });
    expect(screen.getByTestId("tab-explore")).toBeInTheDocument();
  });
});

// ── GroupMenuRestaurants ──────────────────────────────────────────────────────
describe("GroupMenuRestaurants (Group Menu Results)", () => {
  it("renders without crashing", () => {
    const { container } = render(<GroupMenuRestaurants />, { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it("renders the page container", () => {
    render(<GroupMenuRestaurants />, { wrapper: createWrapper() });
    expect(document.querySelector('[data-testid="group-menu-restaurants-page"]')).toBeInTheDocument();
  });

  it("shows fallback heading 'Dish Matches' when no session params", () => {
    render(<GroupMenuRestaurants />, { wrapper: createWrapper() });
    expect(screen.getByText(/Dish Matches/i)).toBeInTheDocument();
  });

  it("shows subtitle about nearby restaurants", () => {
    render(<GroupMenuRestaurants />, { wrapper: createWrapper() });
    expect(screen.getByText(/Restaurants nearby/i)).toBeInTheDocument();
  });

  it("renders bottom navigation", () => {
    render(<GroupMenuRestaurants />, { wrapper: createWrapper() });
    expect(screen.getByTestId("tab-explore")).toBeInTheDocument();
  });

  it("back button is present and clickable", () => {
    render(<GroupMenuRestaurants />, { wrapper: createWrapper() });
    const backBtn = screen.getByTestId("button-back");
    fireEvent.click(backBtn);
    expect(backBtn).toBeInTheDocument();
  });
});
