import { OpsBotConfig } from "../src/config";
import { LabelChecker } from "../src/plugins/LabelChecker/label_checker";
import { makePRContext } from "./fixtures/contexts/pull_request";
import { mockConfigGet, mockContextRepo } from "./mocks";
import { default as repoResp } from "./fixtures/responses/context_repo.json";

const makeConfigReponse = <E extends Partial<OpsBotConfig>>(
  opsBotConfig: E
): { config: E } => {
  return { config: opsBotConfig };
};

// @ts-ignore // ignore type errors for process.exit stub
const mockExit = jest.spyOn(process, "exit").mockImplementation(() => {});
const context = makePRContext({ labels: [] });
mockContextRepo.mockReturnValue(repoResp);

describe("Config Checker", () => {
  beforeEach(() => {
    mockExit.mockReset();
  });

  test.each([
    { enabled: true, mockExitCalls: 0 },
    { enabled: false, mockExitCalls: 1 },
  ])("label_checker: $enabled", async ({ enabled, mockExitCalls }) => {
    mockConfigGet.mockResolvedValueOnce(
      makeConfigReponse({ label_checker: enabled })
    );
    await new LabelChecker(context).checkLabels();
    expect(mockExit).toBeCalledTimes(mockExitCalls);
  });
});
