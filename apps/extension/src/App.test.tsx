import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";

vi.mock("./browser", () => ({
  scanActivePage: vi.fn().mockResolvedValue([
    {
      id: "email",
      label: "Email address",
      kind: "email",
      required: true,
      value: "",
      options: [],
    },
  ]),
  focusField: vi.fn().mockResolvedValue(undefined),
}));

describe("extension scanning workflow", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("shows every planned workflow stage", () => {
    render(<App />);

    for (const stage of ["Profile", "Analyze", "Review", "Audit"]) {
      expect(screen.getByText(stage, { exact: true })).toBeInTheDocument();
    }
  });

  it("shows normalized fields after a user starts a scan", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Scan application" }));

    await waitFor(() =>
      expect(screen.getByText("Email address")).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("heading", { name: "1 safe fields" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Required")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Show Email address on page" }),
    ).toBeInTheDocument();
  });
});
