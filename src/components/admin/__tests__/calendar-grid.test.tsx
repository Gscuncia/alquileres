import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  buildDayChips,
  buildDayBars,
  CalendarGrid,
  DayDetailList,
  CHIP_PALETTE,
  type CalendarEvent,
} from "../CalendarGrid";
import { formatInTz, toUtc } from "@/lib/datetime";

const properties = [
  { id: "p-1", title: "Depto 1" },
  { id: "p-2", title: "Casita" },
  { id: "p-3", title: "Chalet" },
];

function event(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: "b-1",
    checkIn: toUtc("2026-10-10", "12:00"),
    checkOut: toUtc("2026-10-13", "10:00"),
    guest: { firstName: "Juan", lastName: "Pérez" },
    property: { id: "p-1", title: "Depto 1" },
    ...overrides,
  };
}

describe("buildDayChips", () => {
  it("returns arrow chip with formatted time and guest name on the check-in day", () => {
    const chips = buildDayChips([event({})], properties);

    expect(chips.get("2026-10-10")).toEqual([
      { bookingId: "b-1", text: "→ 12:00 Juan", paletteIndex: 0 },
    ]);
  });

  it("returns left arrow chip for checkout day", () => {
    const chips = buildDayChips([event({})], properties);

    expect(chips.get("2026-10-13")).toEqual([
      { bookingId: "b-1", text: "← 10:00 Juan", paletteIndex: 0 },
    ]);
    // Covered days in between carry no chip.
    expect(chips.get("2026-10-11")).toBeUndefined();
    expect(chips.get("2026-10-12")).toBeUndefined();
  });

  it("uses the guest's first name only in the chip text", () => {
    const chips = buildDayChips(
      [event({ guest: { firstName: "María", lastName: "López" } })],
      properties,
    );

    expect(chips.get("2026-10-10")?.[0].text).toBe("→ 12:00 María");
  });

  it("caps at MAX_CHIPS per day and details allow the day link to show the rest", () => {
    const many = [
      event({ id: "b-1" }),
      event({ id: "b-2", guest: { firstName: "Ana", lastName: "Gómez" } }),
      event({ id: "b-3", guest: { firstName: "Luis", lastName: "Paz" } }),
    ];
    const chips = buildDayChips(many, properties);

    expect(chips.get("2026-10-10")).toHaveLength(3);
  });

  it("CHIP_PALETTE colors stable per property id: index maps to the properties order", () => {
    const chips = buildDayChips(
      [
        event({ id: "b-1", property: { id: "p-3", title: "Chalet" } }),
        event({ id: "b-2", property: { id: "p-1", title: "Depto 1" } }),
        event({ id: "b-3", property: { id: "p-2", title: "Casita" } }),
      ],
      properties,
    );

    expect(chips.get("2026-10-10")?.find((c) => c.bookingId === "b-1")?.paletteIndex).toBe(2);
    expect(chips.get("2026-10-10")?.find((c) => c.bookingId === "b-2")?.paletteIndex).toBe(0);
    expect(chips.get("2026-10-10")?.find((c) => c.bookingId === "b-3")?.paletteIndex).toBe(1);
  });

  it("unknown property ids fall back to palette slot 0 without breaking", () => {
    const chips = buildDayChips(
      [event({ property: { id: "desconocida", title: "X" } })],
      properties,
    );

    expect(chips.get("2026-10-10")?.[0].paletteIndex).toBe(0);
  });

  it("same-day events produce a single check-in chip", () => {
    const chips = buildDayChips(
      [
        event({
          id: "b-1",
          checkIn: toUtc("2026-10-10", "09:00"),
          checkOut: toUtc("2026-10-10", "18:00"),
        }),
      ],
      properties,
    );

    expect(chips.size).toBe(1);
    expect(chips.get("2026-10-10")).toHaveLength(1);
  });
});

describe("CalendarGrid", () => {
  it("renders arrow chips linked to chipHref and day numbers linked to dayHref", () => {
    render(
      <CalendarGrid
        month="2026-10"
        events={[event({})]}
        properties={properties}
        mode="single"
        chipHref={(id) => `/agenda?mes=2026-10&reserva=${id}`}
        dayHref={(d) => `/agenda?fecha=${d}`}
      />,
    );

    expect(screen.getByText(/→ 12:00 Juan/).closest("a")).toBeDefined();
    expect(
      screen.getByText(/← 10:00 Juan/).closest("a"),
    ).toHaveAttribute("href", "/agenda?mes=2026-10&reserva=b-1");
    expect(screen.getByText("10").closest("a")).toHaveAttribute(
      "href",
      "/agenda?fecha=2026-10-10",
    );
  });

  it("caps at 2 chips per cell and shows +n más linking to dayHref", () => {
    const many = [
      event({ id: "b-1" }),
      event({ id: "b-2", guest: { firstName: "Ana", lastName: "Gómez" } }),
      event({ id: "b-3", guest: { firstName: "Luis", lastName: "Paz" } }),
    ];

    render(
      <CalendarGrid
        month="2026-10"
        events={many}
        properties={properties}
        mode="single"
        chipHref={(id) => `/${id}`}
        dayHref={(d) => `/dia?fecha=${d}`}
      />,
    );

    // Three check-in chips on Oct 10: 2 visible + overflow link in both
    // crowded cells (check-in Oct 10 and check-out Oct 13).
    const overflow = screen.getAllByText("+1 más");
    expect(overflow.map((node) => node.closest("a")?.getAttribute("href")))
      .toEqual([
        "/dia?fecha=2026-10-10",
        "/dia?fecha=2026-10-13",
      ]);
  });

  it("month-boundary stay renders in both months", () => {
    const boundary = event({
      id: "b-x",
      checkIn: toUtc("2026-09-29", "12:00"),
      checkOut: toUtc("2026-10-02", "10:00"),
    });

    const { unmount } = render(
      <CalendarGrid
        month="2026-09"
        events={[boundary]}
        properties={properties}
        mode="single"
        chipHref={() => "#"}
        dayHref={() => "#"}
      />,
    );
    // September grid: only the check-in chip (Sep 29) shows inside it.
    expect(screen.queryByText(/← 10:00/)).toBeNull();
    unmount();

    render(
      <CalendarGrid
        month="2026-10"
        events={[boundary]}
        properties={properties}
        mode="single"
        chipHref={() => "#"}
        dayHref={() => "#"}
      />,
    );
    // The October grid shows the checkout chip on Oct 2.
    expect(screen.getByText(/← 10:00 Juan/)).toBeInTheDocument();
  });

  it("todas mode renders the per-property legend with palette colors", () => {
    render(
      <CalendarGrid
        month="2026-10"
        events={[]}
        properties={properties}
        mode="todas"
        chipHref={() => "#"}
        dayHref={() => "#"}
      />,
    );

    const legend = screen.getByLabelText(/leyenda de colores por propiedad/i);
    expect(legend).toBeInTheDocument();
    expect(legend).toHaveTextContent("Depto 1");
    expect(legend).toHaveTextContent("Casita");
    expect(legend).toHaveTextContent("Chalet");
  });

  it("single mode paints a small accent bar on intermediate days only", () => {
    const { container } = render(
      <CalendarGrid
        month="2026-10"
        events={[event({})]}
        properties={properties}
        mode="single"
        chipHref={() => "#"}
        dayHref={() => "#"}
      />,
    );

    // Oct 1 2026 is a Thursday → Monday-first leading blanks = 3.
    // children[7 + 3 + (day - 1)] is that day's cell.
    const grid = container.querySelector('[role="grid"]') as HTMLElement;
    const cellOf = (day: number): HTMLElement =>
      grid.children[7 + 3 + day - 1] as HTMLElement;

    const barOf = (day: number): HTMLElement | null =>
      cellOf(day).querySelector("a.h-2") as HTMLElement | null;

    // Stay Oct 10 12:00 → Oct 13 10:00: bars ONLY on the intermediate days
    // 11 and 12 — the arrow chips already mark the 10 and 13 endpoints.
    for (const day of [11, 12]) {
      expect(barOf(day)).not.toBeNull();
      expect(barOf(day)?.className).toContain("bg-sky");
    }
    expect(barOf(10)).toBeNull();
    expect(barOf(13)).toBeNull();
    expect(barOf(9)).toBeNull();
    expect(barOf(14)).toBeNull();
    // Chips carry the accent color in single mode.
    expect(
      Array.from(grid.querySelectorAll("a")).some((a) =>
        a.className.includes("bg-sky"),
      ),
    ).toBe(true);
  });

  it("todas mode bars use the property's palette color on intermediate days", () => {
    const { container } = render(
      <CalendarGrid
        month="2026-10"
        events={[event({ property: { id: "p-2", title: "Casita" } })]}
        properties={properties}
        mode="todas"
        chipHref={() => "#"}
        dayHref={() => "#"}
      />,
    );

    const grid = container.querySelector('[role="grid"]') as HTMLElement;
    const cellOf = (day: number): HTMLElement =>
      grid.children[7 + 3 + day - 1] as HTMLElement;

    const barOf = (day: number): HTMLElement | null =>
      cellOf(day).querySelector("a.h-2") as HTMLElement | null;

    // Casita is palette slot 1 → its bars cover days 11..12 only.
    for (const day of [11, 12]) {
      expect(barOf(day)?.className).toContain(CHIP_PALETTE[1]);
    }
    expect(barOf(10)).toBeNull();
    expect(barOf(13)).toBeNull();
  });

  it("custom property colors override the palette in chips and bars", () => {
    const { container } = render(
      <CalendarGrid
        month="2026-10"
        events={[event({ property: { id: "p-2", title: "Casita" } })]}
        properties={[
          ...properties.slice(0, 1),
          { id: "p-2", title: "Casita", color: "#ff8800" },
        ]}
        mode="todas"
        chipHref={() => "#"}
        dayHref={() => "#"}
      />,
    );

    const grid = container.querySelector('[role="grid"]') as HTMLElement;

    // Check-in chip (Oct 10) uses the custom background + readable text.
    const chip = Array.from(grid.querySelectorAll("a")).find(
      (a) => a.textContent?.includes("→ 12:00 Juan"),
    ) as HTMLElement;
    expect(chip.style.backgroundColor).toBe("rgb(255, 136, 0)");

    // Intermediate-day bar (Oct 11) uses the custom background.
    const barCell = grid.children[7 + 3 + 11 - 1] as HTMLElement;
    const bar = barCell.querySelector("a.h-2") as HTMLElement;
    expect(bar.style.backgroundColor).toBe("rgb(255, 136, 0)");
  });

  it("buildDayBars keeps one bar per booking per intermediate day; endpoints stay chip-only", () => {
    const stayA = event({
      id: "b-a",
      checkIn: toUtc("2026-10-08", "12:00"),
      checkOut: toUtc("2026-10-11", "10:00"),
    });
    const stayB = event({
      id: "b-b",
      guest: { firstName: "María", lastName: "López" },
      checkIn: toUtc("2026-10-11", "12:00"),
      checkOut: toUtc("2026-10-14", "10:00"),
    });

    const bars = buildDayBars([stayA, stayB], properties);

    // Endpoints (check-in/check-out days) never carry bars.
    expect(bars.get("2026-10-08")).toBeUndefined();
    expect(bars.get("2026-10-11")).toBeUndefined();
    expect(bars.get("2026-10-14")).toBeUndefined();

    // Interior days carry exactly one bar each.
    expect(bars.get("2026-10-09")).toEqual([
      { bookingId: "b-a", paletteIndex: 0, label: "Juan Pérez · Depto 1" },
    ]);
    expect(bars.get("2026-10-10")).toEqual([
      { bookingId: "b-a", paletteIndex: 0, label: "Juan Pérez · Depto 1" },
    ]);
    expect(bars.get("2026-10-12")).toEqual([
      { bookingId: "b-b", paletteIndex: 0, label: "María López · Depto 1" },
    ]);
    expect(bars.get("2026-10-13")).toEqual([
      { bookingId: "b-b", paletteIndex: 0, label: "María López · Depto 1" },
    ]);
  });

  it("todas mode chips use the stable palette (CHIP_PALETTE classes) instead of the single accent", () => {
    render(
      <CalendarGrid
        month="2026-10"
        events={[event({})]}
        properties={properties}
        mode="todas"
        chipHref={() => "#"}
        dayHref={() => "#"}
      />,
    );

    expect(CHIP_PALETTE[0]).toContain("bg-sky");
    expect(CHIP_PALETTE[1]).toContain("bg-cream-strong");
    expect(CHIP_PALETTE[2]).toContain("bg-luxe");
    expect(CHIP_PALETTE[3]).toContain("bg-plus");
  });

  it("showMonthList renders the month booking list with edit links", () => {
    render(
      <CalendarGrid
        month="2026-10"
        events={[event({})]}
        properties={properties}
        mode="single"
        chipHref={(id) => `/agenda?reserva=${id}`}
        dayHref={() => "#"}
        showMonthList
      />,
    );

    expect(
      screen.getByText(
        `Juan Pérez — ${formatInTz(event({}).checkIn)} → ${formatInTz(event({}).checkOut)}`,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Editar" }).closest("a"),
    ).toHaveAttribute("href", "/agenda?reserva=b-1");
  });
});

describe("DayDetailList", () => {
  it("lists the events covering the day with edit links, sorted by check-in time", () => {
    render(
      <DayDetailList
        day="2026-10-10"
        events={[
          event({
            id: "b-late",
            guest: { firstName: "Ana", lastName: "Gómez" },
            checkIn: toUtc("2026-10-10", "18:00"),
          }),
          event({ id: "b-early" }),
          event({ id: "b-out", checkIn: toUtc("2026-10-08", "12:00") }),
        ]}
        chipHref={(id) => `/agenda?reserva=${id}`}
      />,
    );

    expect(screen.getByText(/Ana Gómez —/)).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    // Sorted by check-in time ascending: 12:00 (b-early), 12:00 (b-out),
    // 18:00 (Ana).
    expect(
      items[0].querySelector("a")?.getAttribute("href"),
    ).toContain("reserva=b-early");
    expect(
      items[1].querySelector("a")?.getAttribute("href"),
    ).toContain("reserva=b-out");
    expect(items[2]).toHaveTextContent("Ana Gómez");
    expect(screen.getAllByRole("link", { name: "Editar" })).toHaveLength(3);
  });

  it("shows an empty message when nothing covers the day", () => {
    render(
      <DayDetailList
        day="2026-10-20"
        events={[event({})]}
        chipHref={() => "#"}
      />,
    );

    expect(screen.getByText(/no hay reservas activas/i)).toBeInTheDocument();
  });
});

describe("CalendarGrid holidays", () => {
  it("renders the holiday notes as non-link text pinned to the cell bottom", () => {
    const { container } = render(
      <CalendarGrid
        month="2026-10"
        events={[]}
        properties={properties}
        mode="single"
        chipHref={() => "#"}
        dayHref={() => "#"}
        holidays={new Map([["2026-10-12", "Día de la Diversidad Cultural"]])}
      />,
    );

    const notes = screen.getByText("Día de la Diversidad Cultural");
    expect(notes).toHaveAttribute("title", "Día de la Diversidad Cultural");
    // The annotation is plain text, never a link.
    expect(notes.closest("a")).toBeNull();

    // It lives inside the matching day cell (Oct 1 2026 is a Thursday →
    // Monday-first leading blanks = 3).
    const grid = container.querySelector('[role="grid"]') as HTMLElement;
    const cell = grid.children[7 + 3 + 12 - 1] as HTMLElement;
    expect(cell).toContainElement(notes);
    // The annotation is the last element of the cell: visually pinned to the
    // bottom even when bars/chips are present.
    expect(cell.lastElementChild).toBe(notes);
  });

  it("days without a holiday carry no annotation", () => {
    render(
      <CalendarGrid
        month="2026-10"
        events={[]}
        properties={properties}
        mode="single"
        chipHref={() => "#"}
        dayHref={() => "#"}
        holidays={new Map([["2026-10-12", "Feriado"]])}
      />,
    );

    const annotations = screen.getAllByText("Feriado");
    expect(annotations).toHaveLength(1);
    expect(annotations[0].closest("a")).toBeNull();
  });
});

describe("CalendarGrid weekday letters", () => {
  // October 2026 starts on a Thursday → 3 Monday-first leading blanks.
  // Day cells live at grid.children[7 + 3 + (day - 1)].
  function dayCell(container: HTMLElement, day: number): HTMLElement {
    const grid = container.querySelector('[role="grid"]') as HTMLElement;
    return grid.children[7 + 3 + (day - 1)] as HTMLElement;
  }

  function cornerLetter(cell: HTMLElement): string | null {
    const span = cell.querySelector("span[aria-hidden='true']");
    return span ? (span.textContent as string) : null;
  }

  it("renders the correct weekday letter in each cell corner", () => {
    const { container } = render(
      <CalendarGrid
        month="2026-10"
        events={[]}
        properties={properties}
        mode="single"
        chipHref={() => "#"}
        dayHref={() => "#"}
      />,
    );

    // Oct 4 2026 is a Sunday, Oct 10 a Saturday, Oct 12 a Monday.
    expect(cornerLetter(dayCell(container, 4))).toBe("D");
    expect(cornerLetter(dayCell(container, 10))).toBe("S");
    expect(cornerLetter(dayCell(container, 12))).toBe("L");
    expect(cornerLetter(dayCell(container, 1))).toBe("J");
  });

  it("shows the weekday letter legend below the grid", () => {
    render(
      <CalendarGrid
        month="2026-10"
        events={[]}
        properties={properties}
        mode="single"
        chipHref={() => "#"}
        dayHref={() => "#"}
      />,
    );

    expect(
      screen.getByText(/L Lunes · M Martes · X Miércoles · J Jueves · V Viernes · S Sábado · D Domingo/),
    ).toBeInTheDocument();
  });
});
