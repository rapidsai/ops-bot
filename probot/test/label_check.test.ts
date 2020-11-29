import { LabelChecker } from "../src/plugins/LabelCheck/label_check";
import { mocks, pulls } from "./fixtures/context";

describe("Label Check", () => {
  const { mockCreateCommitStatus } = mocks;

  beforeEach(() => {
    mockCreateCommitStatus.mockClear();
  });

  test("no labels", async () => {
    const { noLabels: context } = pulls;
    await new LabelChecker(context).checkLabels();
    expect(mockCreateCommitStatus).toBeCalledTimes(2);
    expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
    expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
    expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
      "Missing category & breaking labels"
    );
  });

  test("no breaking, one category", async () => {
    const { noBreakingOneCat: context } = pulls;
    await new LabelChecker(context).checkLabels();
    expect(mockCreateCommitStatus).toBeCalledTimes(2);
    expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
    expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
    expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
      "Missing breaking label"
    );
  });

  test("no category, one breaking", async () => {
    const { noCatOneBreaking: context } = pulls;
    await new LabelChecker(context).checkLabels();
    expect(mockCreateCommitStatus).toBeCalledTimes(2);
    expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
    expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
    expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
      "Missing category label"
    );
  });

  test("many breaking, one category", async () => {
    const { manyBreakingOneCat: context } = pulls;
    await new LabelChecker(context).checkLabels();
    expect(mockCreateCommitStatus).toBeCalledTimes(2);
    expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
    expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
    expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
      "Too many breaking labels applied"
    );
  });

  test("many category, one breaking", async () => {
    const { manyCatOneBreaking: context } = pulls;
    await new LabelChecker(context).checkLabels();
    expect(mockCreateCommitStatus).toBeCalledTimes(2);
    expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
    expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
    expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
      "Too many category labels applied"
    );
  });

  test("many breaking, no category", async () => {
    const { manyBreakingNoCat: context } = pulls;
    await new LabelChecker(context).checkLabels();
    expect(mockCreateCommitStatus).toBeCalledTimes(2);
    expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
    expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
    expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
      "Missing category label & too many breaking labels applied"
    );
  });

  test("many category, many breaking", async () => {
    const { manyCatManyBreaking: context } = pulls;
    await new LabelChecker(context).checkLabels();
    expect(mockCreateCommitStatus).toBeCalledTimes(2);
    expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
    expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
    expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
      "Too many category & breaking labels applied"
    );
  });

  test("no breaking, many category", async () => {
    const { noBreakingManyCat: context } = pulls;
    await new LabelChecker(context).checkLabels();
    expect(mockCreateCommitStatus).toBeCalledTimes(2);
    expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
    expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
    expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
      "Missing breaking label & too many category labels applied"
    );
  });

  test("correct labels", async () => {
    const { correctLabels: context } = pulls;
    await new LabelChecker(context).checkLabels();
    expect(mockCreateCommitStatus).toBeCalledTimes(2);
    expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
    expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("success");
    expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
      "Correct labels applied"
    );
  });
});
