import { Probot } from "probot";
import { ReleaseDrafter } from "./release_drafter";

export const initReleaseDrafter = (app: Probot) => {
  app.on(["push"], async (context) => {
    await new ReleaseDrafter(context).draftRelease();
  });
};
