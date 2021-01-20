import { makeContext } from "./base";
import { StatusContext } from "../../../src/types";

const makeStatusContext = (state: string = "success"): StatusContext => {
  const payload = {
    state,
    sha: "somerandomsha1234",
    repository: {
      name: "cudf",
      full_name: "rapidsai/cudf",
      owner: {
        login: "rapidsai",
      },
    },
  };

  return (makeContext(payload, "status") as unknown) as StatusContext;
};

export const successStatus = makeStatusContext();
