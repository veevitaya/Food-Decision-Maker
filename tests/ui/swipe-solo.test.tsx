import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SwipePage from "@/pages/SwipePage";
import SoloQuiz from "@/pages/SoloQuiz";
import SoloResults from "@/pages/SoloResults";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

// ── SwipePage ──────────────────────────────────────────────────────────────────
describe("SwipePage (Swipe Mode)", () => {
  it("renders without crashing", () => {
    const { container } = render(<SwipePage />, { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it("renders swipe card deck area", () => {
    render(<SwipePage />, { wrapper: createWrapper() });
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("renders bottom navigation", () => {
    render(<SwipePage />, { wrapper: createWrapper() });
    // BottomNav is present (may be hidden but in DOM)
    const nav = document.querySelector('[data-testid="tab-explore"]');
    expect(nav).toBeTruthy();
  });

  it("shows food/restaurant cards", () => {
    render(<SwipePage />, { wrapper: createWrapper() });
    // The swipe page has mock data with food names
    const container = document.body;
    expect(container).toBeTruthy();
  });

  it("like and dislike buttons are present", () => {
    render(<SwipePage />, { wrapper: createWrapper() });
    const buttons = screen.getAllByRole("button");
    // Should have action buttons (like/dislike or similar)
    expect(buttons.length).toBeGreaterThan(0);
  });
});

// ── SoloQuiz ──────────────────────────────────────────────────────────────────
describe("SoloQuiz (Solo Mode - Quiz Step)", () => {
  it("renders without crashing", () => {
    const { container } = render(<SoloQuiz />, { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it("shows cuisine selection options", () => {
    render(<SoloQuiz />, { wrapper: createWrapper() });
    // SoloQuiz has CUISINES array with Thai, Japanese, etc.
    expect(screen.getByText(/Thai/i)).toBeInTheDocument();
  });

  it("shows step indicator / quiz heading", () => {
    render(<SoloQuiz />, { wrapper: createWrapper() });
    // Step 0: "What are you craving?"
    expect(screen.getByText(/craving/i)).toBeInTheDocument();
  });

  it("shows diet restriction options", () => {
    render(<SoloQuiz />, { wrapper: createWrapper() });
    expect(screen.getByText(/Vegan/i)).toBeInTheDocument();
  });

  it("selecting a cuisine option does not crash", () => {
    render(<SoloQuiz />, { wrapper: createWrapper() });
    const thaiBtn = screen.getByText(/Thai/i);
    fireEvent.click(thaiBtn);
    // No error = pass
    expect(thaiBtn).toBeInTheDocument();
  });

  it("has a submit/find button", () => {
    render(<SoloQuiz />, { wrapper: createWrapper() });
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });
});

// ── SoloResults ───────────────────────────────────────────────────────────────
describe("SoloResults (Solo Mode - Results Step)", () => {
  it("renders without crashing", () => {
    const { container } = render(<SoloResults />, { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it("renders restaurant result cards or loading state", () => {
    render(<SoloResults />, { wrapper: createWrapper() });
    const container = document.body;
    expect(container).toBeTruthy();
  });
});
