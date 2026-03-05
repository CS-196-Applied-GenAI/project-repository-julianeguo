import { render, screen } from "@testing-library/react";
import React from "react";
import { useIsMobile } from "../components/ui/use-mobile";
import { cn } from "../components/ui/utils";

describe("ui utils", () => {
  test("cn merges classes and keeps tailwind conflict resolution", () => {
    expect(cn("p-2", "p-4", "text-sm")).toContain("p-4");
    expect(cn("p-2", "p-4", "text-sm")).not.toContain("p-2");
  });
});

function MobileProbe() {
  const isMobile = useIsMobile();
  return <div data-testid="is-mobile">{String(isMobile)}</div>;
}

describe("useIsMobile", () => {
  test("returns true when window width is under breakpoint", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 500,
    });

    render(<MobileProbe />);
    expect(screen.getByTestId("is-mobile")).toHaveTextContent("true");
  });

  test("returns false when window width is above breakpoint", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1200,
    });

    render(<MobileProbe />);
    expect(screen.getByTestId("is-mobile")).toHaveTextContent("false");
  });
});
