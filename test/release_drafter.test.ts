import { isReleaseBranch } from "../src/plugins/ReleaseDrafter/release_drafter";

describe("Label Check", () => {
  test("isReleaseBranch", () => {
    expect(isReleaseBranch("branch-0.17")).toBe(true);
    expect(isReleaseBranch("branch-0.18")).toBe(true);
    expect(isReleaseBranch("branch-0.19")).toBe(true);
    expect(isReleaseBranch("gh-pages")).toBe(false);
    expect(isReleaseBranch("main")).toBe(false);
  });
});
