import {
  createCommitMessage,
  hasValidMergeLabelActor,
  isPrMergeable,
  sanitizePrTitle,
} from "../src/utils";
import { dirtyState, mergingToMain, prToMerge } from "./fixtures/pull_request";
import { issue_events } from "./fixtures/issue_events";
import { pull_request_reviews } from "./fixtures/pull_request_reviews";

describe("Utils tests", () => {
  const paginateSpy = jest.fn();
  const getCollaboratorPermissionLevelSpy = jest.fn();
  const clientSpy = {
    paginate: paginateSpy,
    teams: {
      listMembersInOrg: "",
    },
    users: {
      getByUsername: ({ username }) => {
        return { data: { name: username } };
      },
    },
    pulls: {
      listReviews: () => {},
    },
    repos: {
      getCollaboratorPermissionLevel: getCollaboratorPermissionLevelSpy,
    },
  };
  beforeEach(() => {
    paginateSpy.mockClear();
    getCollaboratorPermissionLevelSpy.mockClear();
  });

  test("isPrMergable", () => {
    let isMergable = isPrMergeable(prToMerge as any);
    expect(isMergable).toBe(true);
    isMergable = isPrMergeable(mergingToMain as any);
    expect(isMergable).toBe(false);
    isMergable = isPrMergeable(dirtyState as any);
    expect(isMergable).toBe(false);
  });

  test("sanitizePrTitle", () => {
    let title = sanitizePrTitle("[sKip-Ci] This is the title");
    expect(title).toBe("This is the title");
    title = sanitizePrTitle(
      "[REVIEW][WIP] Support fixed-point decimal for HostColumnVector [skip ci] "
    );
    expect(title).toBe("Support fixed-point decimal for HostColumnVector");
    title = sanitizePrTitle("Without square brackets");
    expect(title).toBe("Without square brackets");
  });

  test.each([
    ["admin", true],
    ["write", true],
    ["read", false],
  ])("hasValidMergeLabelActor - %s", async (permission, expectedResult) => {
    // Mocks listMembersInOrg response
    getCollaboratorPermissionLevelSpy.mockResolvedValue({
      data: { permission },
    });

    let result = await hasValidMergeLabelActor(
      clientSpy as any,
      prToMerge as any,
      issue_events as any
    );
    expect(result).toBe(expectedResult);
    expect(getCollaboratorPermissionLevelSpy).toBeCalledTimes(1);
    expect(getCollaboratorPermissionLevelSpy.mock.calls[0][0]).toMatchObject({
      owner: "rapidsai",
      repo: "cudf",
      username: "thecorrectuser",
    });
  });

  test("createCommitMessage", async () => {
    paginateSpy.mockResolvedValue(pull_request_reviews);

    let result = await createCommitMessage(
      clientSpy as any,
      prToMerge as any,
      issue_events as any
    );

    expect(result).toBe(
      `This is the PR body.

Authors:
  - AJ Schmidt <ajschmidt8@users.noreply.github.com>
  - Ray Douglass <ray@users.noreply.github.com>
  - Ram (Ramakrishna Prabhu) <ram@users.noreply.github.com>

Approvers:
  - rgsl888prabhu
  - rgsl888prabhu
  - codereport
  - cwharris

URL: https://github.com/rapidsai/cudf/pull/6609`
    );
    expect(paginateSpy).toBeCalledTimes(1);
  });
});
