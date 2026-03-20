/**
 * Feedback API client — public endpoints (no auth).
 * Base URL: set VITE_API_BASE_URL in .env (e.g. https://api.example.com).
 */

const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
    /\/$/,
    ""
  ) ?? "";

export type QuestionType = "rating" | "multiple_choice" | "free_text";

export interface Question {
  id: string;
  question_text: string;
  question_type: QuestionType;
  options: string[] | null;
  display_order: number;
}

export interface FeedbackForm {
  work_order_id: number;
  questions: Question[];
}

export interface AnswerInput {
  question_id: string | null;
  question_text?: string;
  answer_value: string;
}

export interface SubmitFeedbackRequest {
  answers: AnswerInput[];
}

function getFeedbackUrl(token: string): string {
  return `${BASE_URL}/feedback/${encodeURIComponent(token)}`;
}

export async function getFeedbackForm(
  token: string
): Promise<FeedbackForm> {
  const url = getFeedbackUrl(token);
  const res = await fetch(url);
  if (res.status === 404) {
    throw new FeedbackError("not_found", "Link expired or invalid.");
  }
  if (res.status === 409) {
    throw new FeedbackError("already_submitted", "You've already submitted feedback for this work order.");
  }
  if (!res.ok) {
    throw new FeedbackError("server_error", "Something went wrong. Please try again later.");
  }
  return res.json() as Promise<FeedbackForm>;
}

export async function submitFeedback(
  token: string,
  body: SubmitFeedbackRequest
): Promise<unknown> {
  const url = `${getFeedbackUrl(token)}/submit`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 404) {
    throw new FeedbackError("not_found", "Link expired or invalid.");
  }
  if (res.status === 409) {
    throw new FeedbackError("already_submitted", "You've already submitted feedback for this work order.");
  }
  if (res.status === 400) {
    const data = await res.json().catch(() => ({}));
    const message =
      typeof data?.message === "string"
        ? data.message
        : "Please check your answers and try again.";
    throw new FeedbackError("validation", message);
  }
  if (!res.ok) {
    throw new FeedbackError("server_error", "Something went wrong. Please try again later.");
  }
  return res.json();
}

export class FeedbackError extends Error {
  readonly code: "not_found" | "already_submitted" | "validation" | "server_error";
  constructor(
    code: "not_found" | "already_submitted" | "validation" | "server_error",
    message: string
  ) {
    super(message);
    this.name = "FeedbackError";
    this.code = code;
  }
}
