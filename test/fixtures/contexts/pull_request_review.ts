import { makeContext } from "./base";
import { PRReviewContext } from "../../../src/types";
type RespParams = {
  state?: string;
};

const makePRReviewContext = ({
  state = "commented",
}: RespParams = {}): PRReviewContext => {
  const payload = {
    pull_request: {
      number: 798,
    },
    review: {
      state,
    },
    repository: {
      name: "cudf",
      full_name: "rapidsai/cudf",
      owner: {
        login: "rapidsai",
      },
    },
  };

  return (makeContext(
    payload,
    "pull_request_review.submitted"
  ) as unknown) as PRReviewContext;
};

export const commented = makePRReviewContext();
