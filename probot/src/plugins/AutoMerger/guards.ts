import {
  AutoMergerContext,
  IssueCommentContext,
  PRReviewContext,
  StatusContext,
} from "../../types";

/**
 * Type guard that determines whether or not the provided context
 * is a StatusContext
 * @param context
 */
export const isStatusContext = (
  context: AutoMergerContext
): context is StatusContext => {
  return (context as StatusContext).payload.sha !== undefined;
};

/**
 * Type guard that determines whether or not the provided context
 * is an IssueCommentContext
 * @param context
 */
export const isIssueCommentContext = (
  context: AutoMergerContext
): context is IssueCommentContext => {
  return (context as IssueCommentContext).payload.comment !== undefined;
};

/**
 * Type guard that determines whether or not the provided context
 * is a PRReviewContext
 * @param context
 */
export const isPRReviewContext = (
  context: AutoMergerContext
): context is PRReviewContext => {
  return (context as PRReviewContext).payload.pull_request !== undefined;
};
