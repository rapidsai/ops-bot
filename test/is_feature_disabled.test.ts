import { featureIsDisabled } from "../src/shared";
import { makePRContext } from "./fixtures/contexts/pull_request";
import { mockConfigGet, mockContextRepo } from "./mocks";
import { default as repoResp } from "./fixtures/responses/context_repo.json";
import { makeConfigReponse } from "./fixtures/responses/get_config";

const context = makePRContext();
mockContextRepo.mockReturnValue(repoResp);

describe("Config Checker", () => {
  beforeEach(() => {
    mockConfigGet.mockReset();
  });

  test.each([
    { isEnabled: true, expectedResult: false },
    { isEnabled: false, expectedResult: true },
  ])("label_checker: $isEnabled", async ({ isEnabled, expectedResult }) => {
    mockConfigGet.mockResolvedValueOnce(
      makeConfigReponse({ label_checker: isEnabled })
    );
    const result = await featureIsDisabled(context, "label_checker");
    expect(result).toBe(expectedResult);
  });
});
