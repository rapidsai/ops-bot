import {
  createCommitMessage,
  hasValidMergeLabelActor,
  isPrMergeable,
  sanitizePrTitle,
} from "../src/utils";
import {
  dirtyState,
  notMergingToDefaultBranch,
  prToMerge,
} from "./fixtures/pull_request";
import { issue_events } from "./fixtures/issue_events";
import { users } from "./fixtures/users";
import { pull_request_reviews } from "./fixtures/pull_request_reviews";

describe("Utils tests", () => {
  const paginateSpy = jest.fn();
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
  };
  beforeEach(() => {
    paginateSpy.mockClear();
  });

  test("isPrMergable", () => {
    let isMergable = isPrMergeable(prToMerge as any);
    expect(isMergable).toBe(true);
    isMergable = isPrMergeable(notMergingToDefaultBranch as any);
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

  test("hasValidMergeLabelActor", async () => {
    // Mocks listMembersInOrg response
    paginateSpy.mockResolvedValue([
      { login: "thecorrectuser" },
      { login: "ajschmidt8" },
    ]);

    let result = await hasValidMergeLabelActor(
      clientSpy as any,
      prToMerge as any,
      issue_events as any
    );
    expect(result).toBe(true);
    expect(paginateSpy).toBeCalledTimes(1);
    expect(paginateSpy.mock.calls[0][1]).toMatchObject({
      org: "rapidsai",
      team_slug: "cudf-write",
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
