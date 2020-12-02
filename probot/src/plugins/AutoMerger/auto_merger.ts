import { AutoMergerContext } from "../../types";
import {
  isIssueCommentContext,
  isPRReviewContext,
  isStatusContext,
} from "./guards";

export class AutoMerger {
  public context: AutoMergerContext;
  constructor(context: AutoMergerContext) {
    this.context = context;
  }

  async maybeMergePR(): Promise<any> {
    const context = this.context;

    if (isStatusContext(context)) {
      // context.payload.
    } else if (isIssueCommentContext(context)) {
      // context.payload.
    } else if (isPRReviewContext(context)) {
      // context.payload.
    }
  }
}
