import { PRBranchChecker } from "../src/plugins/BranchChecker/pull_request";
import { RepositoryBranchChecker } from "../src/plugins/BranchChecker/repository";
import { makePRContext } from "./fixtures/contexts/pull_request";
import { makeRepositoryContext } from "./fixtures/contexts/repository";
import { mockCreateCommitStatus, mockListPulls, mockPaginate } from "./mocks";
import { branch_checker as listPullsResp } from "./fixtures/responses/list_pulls.json";

describe("Label Checker", () => {
  describe("Pull Request Event", () => {
    beforeEach(() => {
      mockCreateCommitStatus.mockReset();
    });

    test("release PR", async () => {
      const context = makePRContext({
        title: "[RELEASE] cuml v0.18",
        user: "GPUtester",
      });
      await new PRBranchChecker(context).checkPR();
      expect(mockCreateCommitStatus).toBeCalledTimes(2);
      expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
      expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("success");
      expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
        "Release PR detected"
      );
    });

    test("non-versioned base branch", async () => {
      const context = makePRContext({
        baseRef: "not-a-versioned-branch",
      });
      await new PRBranchChecker(context).checkPR();
      expect(mockCreateCommitStatus).toBeCalledTimes(2);
      expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
      expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
      expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
        "Base branch is not under active development"
      );
    });

    test("old versioned branch", async () => {
      const context = makePRContext({
        baseRef: "branch-0.15",
        baseDefaultBranch: "branch-0.18",
      });
      await new PRBranchChecker(context).checkPR();
      expect(mockCreateCommitStatus).toBeCalledTimes(2);
      expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
      expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
      expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
        "Base branch is not under active development"
      );
    });

    test("default branch + 2", async () => {
      const context = makePRContext({
        baseRef: "branch-0.20",
        baseDefaultBranch: "branch-0.18",
      });
      await new PRBranchChecker(context).checkPR();
      expect(mockCreateCommitStatus).toBeCalledTimes(2);
      expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
      expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
      expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
        "Base branch is not under active development"
      );
    });

    test("active development branch", async () => {
      const context = makePRContext({
        baseRef: "branch-21.06",
        baseDefaultBranch: "branch-21.06",
      });
      await new PRBranchChecker(context).checkPR();
      expect(mockCreateCommitStatus).toBeCalledTimes(2);
      expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
      expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("success");
      expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
        "Base branch is under active development"
      );
    });
  
    test("next development branch", async () => {
      //TODO Update this when next branch is supported, for now assert failure
      const context = makePRContext({
        baseRef: "branch-21.08",
        baseDefaultBranch: "branch-21.06",
      });
      await new PRBranchChecker(context).checkPR();
      expect(mockCreateCommitStatus).toBeCalledTimes(2);
      expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
      expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
      expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
        "Base branch is not under active development"
      );
    });
});

  describe("Repository Event", () => {
    beforeEach(() => {
      mockCreateCommitStatus.mockReset();
      mockPaginate.mockReset();
    });

    test("release PR", async () => {
      mockPaginate.mockResolvedValueOnce(listPullsResp);
      const context = makeRepositoryContext();
      await new RepositoryBranchChecker(context).checkAllPRs();
      expect(mockPaginate).toBeCalledTimes(1);
      expect(mockPaginate.mock.calls[0][0]).toBe(mockListPulls);
      expect(mockPaginate.mock.calls[0][1]).toStrictEqual({
        owner: "rapidsai",
        repo: "cudf",
        per_page: 100,
      });
      expect(mockCreateCommitStatus).toBeCalledTimes(2);
      expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
      expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("success");
      expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
        "Release PR detected"
      );
    });
  });
});
