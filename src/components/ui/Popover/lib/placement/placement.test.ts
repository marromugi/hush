import { describe, expect, it } from "vitest";

import { originFor, placementFor } from "./placement";

describe("placementFor", () => {
  it("is the direction alone when centred", () => {
    expect(placementFor("bottom", "center")).toBe("bottom");
  });

  it("adds the alignment to the direction", () => {
    expect(placementFor("right", "start")).toBe("right-start");
    expect(placementFor("top", "end")).toBe("top-end");
  });
});

describe("originFor", () => {
  it("is the middle of the edge facing the trigger when centred", () => {
    expect(originFor("bottom")).toBe("top center");
    expect(originFor("right")).toBe("left center");
  });

  it("is the corner nearest the trigger above or below it", () => {
    expect(originFor("bottom-start")).toBe("top left");
    expect(originFor("top-end")).toBe("bottom right");
  });

  it("is the corner nearest the trigger beside it", () => {
    expect(originFor("right-start")).toBe("left top");
    expect(originFor("left-end")).toBe("right bottom");
  });
});
