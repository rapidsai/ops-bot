import { LabelChecker } from "../src/plugins/LabelChecker/label_checker";
import * as context from "./fixtures/contexts/pull_request";
import { mockCreateCommitStatus } from "./mocks";

describe("Label Check", () => {
  beforeEach(() => {
    mockCreateCommitStatus.mockReset();
  });

  test("no labels", async () => {
    await new LabelChecker(context.noLabels).checkLabels();
    expect(mockCreateCommitStatus).toBeCalledTimes(2);
    expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
    expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
    expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
      "Missing category & breaking labels"
    );
  });

  test("no breaking, one category", async () => {
    await new LabelChecker(context.noBreakingOneCat).checkLabels();
    expect(mockCreateCommitStatus).toBeCalledTimes(2);
    expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
    expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
    expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
      "Missing breaking label"
    );
  });

  test("no category, one breaking", async () => {
    await new LabelChecker(context.noCatOneBreaking).checkLabels();
    expect(mockCreateCommitStatus).toBeCalledTimes(2);
    expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
    expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
    expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
      "Missing category label"
    );
  });

  test("many breaking, one category", async () => {
    await new LabelChecker(context.manyBreakingOneCat).checkLabels();
    expect(mockCreateCommitStatus).toBeCalledTimes(2);
    expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
    expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
    expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
      "Too many breaking labels applied"
    );
  });

  test("many category, one breaking", async () => {
    await new LabelChecker(context.manyCatOneBreaking).checkLabels();
    expect(mockCreateCommitStatus).toBeCalledTimes(2);
    expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
    expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
    expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
      "Too many category labels applied"
    );
  });

  test("many breaking, no category", async () => {
    await new LabelChecker(context.manyBreakingNoCat).checkLabels();
    expect(mockCreateCommitStatus).toBeCalledTimes(2);
    expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
    expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
    expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
      "Missing category label & too many breaking labels applied"
    );
  });

  test("many category, many breaking", async () => {
    await new LabelChecker(context.manyCatManyBreaking).checkLabels();
    expect(mockCreateCommitStatus).toBeCalledTimes(2);
    expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
    expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
    expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
      "Too many category & breaking labels applied"
    );
  });

  test("no breaking, many category", async () => {
    await new LabelChecker(context.noBreakingManyCat).checkLabels();
    expect(mockCreateCommitStatus).toBeCalledTimes(2);
    expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
    expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
    expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
      "Missing breaking label & too many category labels applied"
    );
  });

  test("correct labels", async () => {
    await new LabelChecker(context.correctLabels).checkLabels();
    expect(mockCreateCommitStatus).toBeCalledTimes(2);
    expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
    expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("success");
    expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
      "Correct labels applied"
    );
  });
});
