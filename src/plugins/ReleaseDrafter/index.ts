import { Application } from "probot";
import { ReleaseDrafter } from "./release_drafter";

export const initReleaseDrafter = (app: Application) => {
  app.on(["push"], async (context) => {
    await new ReleaseDrafter(context).draftRelease();
  });
};
