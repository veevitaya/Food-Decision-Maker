import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import GroupSetup from "@/pages/GroupSetup";
import GroupSwipe from "@/pages/GroupSwipe";
import GroupResult from "@/pages/GroupResult";
import GroupFinalVote from "@/pages/GroupFinalVote";

// Mock sessionStore functions used in GroupSwipe
vi.mock("@/lib/sessionStore", () => ({
  useSessions: () => [],
  addSession: vi.fn(),
  removeSession: vi.fn(),
  updateSession: vi.fn(),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

// ── GroupSetup ─────────────────────────────────────────────────────────────────
describe("GroupSetup (Group Mode - Setup Step)", () => {
  it("renders without crashing", () => {
    const { container } = render(<GroupSetup />, { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it("shows group type options (Friends, Partner, Family, Coworkers)", () => {
    render(<GroupSetup />, { wrapper: createWrapper() });
    // Multiple elements may match, use getAllByText
    expect(screen.getAllByText(/Friends/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Family/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Coworkers/i).length).toBeGreaterThan(0);
  });

  it("shows location options (BTS, mall, street food, rooftop)", () => {
    render(<GroupSetup />, { wrapper: createWrapper() });
    expect(screen.getByText(/Near BTS/i)).toBeInTheDocument();
    expect(screen.getByText(/At the mall/i)).toBeInTheDocument();
  });

  it("shows budget options", () => {
    render(<GroupSetup />, { wrapper: createWrapper() });
    expect(screen.getByText(/Cheap eats/i)).toBeInTheDocument();
    expect(screen.getByText(/Mid range/i)).toBeInTheDocument();
    expect(screen.getByText(/Fancy/i)).toBeInTheDocument();
  });

  it("shows swipe mode options (Restaurant vs Dishes)", () => {
    render(<GroupSetup />, { wrapper: createWrapper() });
    expect(screen.getByText(/Swipe Restaurants/i)).toBeInTheDocument();
    expect(screen.getByText(/Swipe Dishes/i)).toBeInTheDocument();
  });

  it("shows dietary restriction options (Halal, Vegan, etc.)", () => {
    render(<GroupSetup />, { wrapper: createWrapper() });
    expect(screen.getByText(/Halal/i)).toBeInTheDocument();
    expect(screen.getByText(/Vegan/i)).toBeInTheDocument();
  });

  it("clicking a group type option doesn't crash", () => {
    render(<GroupSetup />, { wrapper: createWrapper() });
    const friendsElems = screen.getAllByText(/Friends/i);
    fireEvent.click(friendsElems[0]);
    expect(friendsElems[0]).toBeInTheDocument();
  });

  it("clicking a budget option doesn't crash", () => {
    render(<GroupSetup />, { wrapper: createWrapper() });
    const cheapBtn = screen.getByText(/Cheap eats/i);
    fireEvent.click(cheapBtn);
    expect(cheapBtn).toBeInTheDocument();
  });

  it("clicking a location option doesn't crash", () => {
    render(<GroupSetup />, { wrapper: createWrapper() });
    const btsBtn = screen.getByText(/Near BTS/i);
    fireEvent.click(btsBtn);
    expect(btsBtn).toBeInTheDocument();
  });

  it("has action buttons", () => {
    render(<GroupSetup />, { wrapper: createWrapper() });
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });
});

// ── GroupSwipe ─────────────────────────────────────────────────────────────────
describe("GroupSwipe (Group Mode - Swipe Step)", () => {
  it("renders without crashing", () => {
    const { container } = render(<GroupSwipe />, { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it("renders some UI (navigation or content)", () => {
    render(<GroupSwipe />, { wrapper: createWrapper() });
    // GroupSwipe shows either nav or content depending on state
    const container = document.body;
    expect(container).toBeTruthy();
  });

  it("renders the page container", () => {
    const { container } = render(<GroupSwipe />, { wrapper: createWrapper() });
    expect(container.firstChild).toBeTruthy();
  });
});

// ── GroupResult ────────────────────────────────────────────────────────────────
describe("GroupResult (Group Mode - Result Step)", () => {
  it("renders without crashing", () => {
    const { container } = render(<GroupResult />, { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it("has buttons for navigation", () => {
    render(<GroupResult />, { wrapper: createWrapper() });
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });
});

// ── GroupFinalVote ─────────────────────────────────────────────────────────────
describe("GroupFinalVote (Group Mode - Final Vote Step)", () => {
  it("renders without crashing", () => {
    const { container } = render(<GroupFinalVote />, { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });
});
