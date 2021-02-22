import { makeContext } from "./base";
import { RepositoryContext } from "../../../src/types";

export const makeRepositoryContext = (): RepositoryContext => {
  const payload = {
    repository: {
      name: "cudf",
      full_name: "rapidsai/cudf",
      owner: {
        login: "rapidsai",
      },
    },
  };

  return (makeContext(payload, "repository") as unknown) as RepositoryContext;
};
