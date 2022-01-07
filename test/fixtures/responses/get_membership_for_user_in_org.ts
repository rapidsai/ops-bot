const makeResponse = (state: string = "") => ({
  data: {
    state: `${state}`
  }
});

export const opsTeamMember = makeResponse("active");
export const nonOpsTeamMember = makeResponse();
