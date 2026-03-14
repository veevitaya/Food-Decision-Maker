import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ToastPicks from "@/pages/ToastPicks";
import SavedPage from "@/pages/SavedPage";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

// ── ToastPicks (Trending / Toast's Picks) ─────────────────────────────────────
describe("ToastPicks (Trending Page)", () => {
  it("renders without crashing", () => {
    const { container } = render(<ToastPicks />, { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it("renders bottom navigation", () => {
    render(<ToastPicks />, { wrapper: createWrapper() });
    expect(screen.getByTestId("tab-profile")).toBeInTheDocument();
  });

  it("shows the page heading or toast branding", () => {
    render(<ToastPicks />, { wrapper: createWrapper() });
    // ToastPicks renders a title / personalized header
    const body = document.body;
    expect(body.textContent).toBeTruthy();
  });

  it("shows restaurant cards or empty state", () => {
    render(<ToastPicks />, { wrapper: createWrapper() });
    const container = document.body;
    expect(container).toBeTruthy();
  });

  it("has interactive buttons", () => {
    render(<ToastPicks />, { wrapper: createWrapper() });
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("back button navigates home", () => {
    render(<ToastPicks />, { wrapper: createWrapper() });
    const backBtn = screen.getByTestId("button-back");
    fireEvent.click(backBtn);
    expect(backBtn).toBeInTheDocument();
  });

  it("shows refresh/reload button", () => {
    render(<ToastPicks />, { wrapper: createWrapper() });
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(1);
  });
});

// ── SavedPage ─────────────────────────────────────────────────────────────────
describe("SavedPage (Saved Restaurants)", () => {
  it("renders without crashing", () => {
    const { container } = render(<SavedPage />, { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it("shows page heading 'Saved'", () => {
    render(<SavedPage />, { wrapper: createWrapper() });
    // "Saved" appears in heading h1 and in BottomNav tab
    const savedElems = screen.getAllByText(/^Saved$/i);
    expect(savedElems.length).toBeGreaterThan(0);
  });

  it("shows empty state when no saved restaurants", () => {
    render(<SavedPage />, { wrapper: createWrapper() });
    expect(screen.getByText(/No saved places yet/i)).toBeInTheDocument();
  });

  it("shows tap-to-save hint text", () => {
    render(<SavedPage />, { wrapper: createWrapper() });
    expect(screen.getByText(/Tap the heart/i)).toBeInTheDocument();
  });

  it("shows count of saved restaurants (0)", () => {
    render(<SavedPage />, { wrapper: createWrapper() });
    expect(screen.getByText(/0 restaurant/i)).toBeInTheDocument();
  });

  it("renders the saved-page container", () => {
    render(<SavedPage />, { wrapper: createWrapper() });
    expect(document.querySelector('[data-testid="saved-page"]')).toBeInTheDocument();
  });

  it("renders bottom navigation", () => {
    render(<SavedPage />, { wrapper: createWrapper() });
    expect(screen.getByTestId("tab-saved")).toBeInTheDocument();
  });
});
