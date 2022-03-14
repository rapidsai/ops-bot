import { LabelChecker } from "../src/plugins/LabelChecker/label_checker";
import { makePRContext } from "./fixtures/contexts/pull_request";
import { mockConfigGet, mockContextRepo, mockExit } from "./mocks";
import { default as repoResp } from "./fixtures/responses/context_repo.json";
import { makeConfigReponse } from "./fixtures/responses/get_config";

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
