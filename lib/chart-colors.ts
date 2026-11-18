/**
 * Chart colours for the dark surface (shared by server pages and client charts,
 * so they live outside the "use client" chart module). Solid fills only.
 * Categorical colours go to an entity in a fixed order, never by rank.
 */
export const SERIES = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#0ca30c", "#9085e9", "#e66767"];
export const METHOD_COLORS = { cash: SERIES[0], transfer: SERIES[1], pos: SERIES[2], none: "#5b5b63" } as const;
export const OTHER_COLOR = "#5b5b63";
