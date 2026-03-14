import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RestaurantDetail from "@/pages/RestaurantDetail";
import RestaurantList from "@/pages/RestaurantList";

// Mock wouter with restaurant detail route match
vi.mock("wouter", () => ({
  useLocation: () => ["/restaurant/201", vi.fn()],
  useRoute: (pattern: string) => {
    if (pattern === "/restaurant/:id") return [true, { id: "201" }];
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

// ── RestaurantDetail ──────────────────────────────────────────────────────────
describe("RestaurantDetail Page", () => {
  it("renders without crashing", () => {
    const { container } = render(<RestaurantDetail />, { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it("renders bottom navigation", () => {
    render(<RestaurantDetail />, { wrapper: createWrapper() });
    expect(screen.getByTestId("tab-explore")).toBeInTheDocument();
  });

  it("shows restaurant name for known mock id (201 = Thipsamai)", () => {
    render(<RestaurantDetail />, { wrapper: createWrapper() });
    expect(screen.getByText(/Thipsamai/i)).toBeInTheDocument();
  });

  it("shows rating information", () => {
    render(<RestaurantDetail />, { wrapper: createWrapper() });
    expect(screen.getByText(/4\.9/i)).toBeInTheDocument();
  });

  it("shows address info", () => {
    render(<RestaurantDetail />, { wrapper: createWrapper() });
    expect(screen.getByText(/Maha Chai/i)).toBeInTheDocument();
  });

  it("shows back navigation button", () => {
    render(<RestaurantDetail />, { wrapper: createWrapper() });
    expect(screen.getByTestId("button-back-hero")).toBeInTheDocument();
  });

  it("back button is clickable", () => {
    render(<RestaurantDetail />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByTestId("button-back-hero"));
    expect(screen.getByTestId("button-back-hero")).toBeInTheDocument();
  });

  it("shows mock review authors", () => {
    render(<RestaurantDetail />, { wrapper: createWrapper() });
    expect(screen.getByText(/Nook P\./i)).toBeInTheDocument();
  });

  it("shows opening hours section", () => {
    render(<RestaurantDetail />, { wrapper: createWrapper() });
    // "Open now" subtitle always shows today's hours or fallback
    expect(screen.getByTestId("button-toggle-hours")).toBeInTheDocument();
  });

  it("has interactive buttons (save, share, etc.)", () => {
    render(<RestaurantDetail />, { wrapper: createWrapper() });
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });
});

// ── RestaurantList - default (Restaurants category) ──────────────────────────
describe("RestaurantList Page - default state", () => {
  it("renders without crashing", () => {
    const { container } = render(<RestaurantList />, { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it("renders the restaurant-list-page container", () => {
    render(<RestaurantList />, { wrapper: createWrapper() });
    expect(document.querySelector('[data-testid="restaurant-list-page"]')).toBeInTheDocument();
  });

  it("renders bottom navigation", () => {
    render(<RestaurantList />, { wrapper: createWrapper() });
    expect(screen.getByTestId("tab-explore")).toBeInTheDocument();
  });

  it("shows back button", () => {
    render(<RestaurantList />, { wrapper: createWrapper() });
    expect(screen.getByTestId("button-back")).toBeInTheDocument();
  });
});

// ── RestaurantList - Bars category ────────────────────────────────────────────
describe("RestaurantList Page - Bars category", () => {
  beforeEach(() => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...window.location, search: "?category=Bars" },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...window.location, search: "" },
    });
  });

  it("shows Bars heading", () => {
    render(<RestaurantList />, { wrapper: createWrapper() });
    expect(screen.getByText(/🍸 Bars/i)).toBeInTheDocument();
  });

  it("shows drunk toast mascot for Bars", () => {
    render(<RestaurantList />, { wrapper: createWrapper() });
    expect(screen.getByTestId("img-drunk-toast")).toBeInTheDocument();
  });

  it("shows Tep Bar in the list", () => {
    render(<RestaurantList />, { wrapper: createWrapper() });
    expect(screen.getByText(/Tep Bar/i)).toBeInTheDocument();
  });

  it("shows restaurant cards", () => {
    render(<RestaurantList />, { wrapper: createWrapper() });
    expect(document.querySelector('[data-testid^="card-restaurant-"]')).toBeInTheDocument();
  });
});

// ── RestaurantList - Thai category ────────────────────────────────────────────
describe("RestaurantList Page - Thai category", () => {
  beforeEach(() => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...window.location, search: "?category=Thai" },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...window.location, search: "" },
    });
  });

  it("shows Thai restaurants (Thipsamai)", () => {
    render(<RestaurantList />, { wrapper: createWrapper() });
    expect(screen.getByText(/Thipsamai/i)).toBeInTheDocument();
  });

  it("shows Jay Fai in the list", () => {
    render(<RestaurantList />, { wrapper: createWrapper() });
    expect(screen.getByText(/Jay Fai/i)).toBeInTheDocument();
  });
});
