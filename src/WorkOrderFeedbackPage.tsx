import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  type AnswerInput,
  type Question,
  FeedbackError,
  getFeedbackForm,
  submitFeedback,
} from "./api/feedback";
import "./work-order-feedback.css";

const RATING_LABELS: Record<number, string> = {
  1: "Very dissatisfied",
  2: "Dissatisfied",
  3: "Neutral",
  4: "Satisfied",
  5: "Very satisfied",
};

type OptionTone = "positive" | "neutral" | "negative" | "warning";

function getOptionTone(index: number, total: number): OptionTone {
  if (total <= 0) return "neutral";
  if (index === 0) return "positive";
  if (index === total - 1) return "negative";
  if (index === 1 && total > 2) return "warning";
  return "neutral";
}

const SORTED_QUESTIONS = (questions: Question[]): Question[] =>
  [...questions].sort((a, b) => a.display_order - b.display_order);

export default function WorkOrderFeedbackPage() {
  const { token } = useParams<{ token: string }>();
  const [form, setForm] = useState<{ work_order_id: number; questions: Question[] } | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "idle" | "error">("loading");
  const [loadError, setLoadError] = useState<{ code: string; message: string } | null>(null);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [extraQuestionText, setExtraQuestionText] = useState("");
  const [extraQuestionAnswer, setExtraQuestionAnswer] = useState("");
  const [step, setStep] = useState(0);
  const [flashTarget, setFlashTarget] = useState<"next" | "submit" | null>(null);
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "success">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [submitArmed, setSubmitArmed] = useState(false);
  const flashTimeout = useRef<number | null>(null);

  const questions = useMemo(
    () => (form ? SORTED_QUESTIONS(form.questions) : []),
    [form]
  );
  const workOrderId = form?.work_order_id ?? 0;

  const totalSteps = questions.length + 1;
  const isAddQuestionStep = step === questions.length;
  const isSuccessStep = submitState === "success";
  const currentQuestion = step < questions.length ? questions[step] : null;
  const progressTotalSteps = totalSteps;

  const hasCurrentAnswer =
    !currentQuestion ||
    currentQuestion.question_type === "free_text" ||
    (currentQuestion.question_type === "rating"
      ? answers[currentQuestion.id] !== undefined && answers[currentQuestion.id] !== ""
      : (answers[currentQuestion.id] ?? "").trim() !== "");

  const allRequiredAnswered = questions.every((q) => {
    if (q.question_type === "free_text") return true;
    const v = answers[q.id];
    return v !== undefined && String(v).trim() !== "";
  });

  const isValid = allRequiredAnswered;
  const currentStepValid =
    isAddQuestionStep || hasCurrentAnswer;

  useEffect(() => {
    if (!token) {
      setLoadError({ code: "not_found", message: "Missing feedback link." });
      setLoadState("error");
      return;
    }
    let cancelled = false;
    setLoadState("loading");
    setLoadError(null);
    getFeedbackForm(token)
      .then((data) => {
        if (!cancelled) {
          setForm({ work_order_id: data.work_order_id, questions: data.questions });
          setLoadState("idle");
        }
      })
      .catch((err) => {
        if (!cancelled && err instanceof FeedbackError) {
          setLoadError({ code: err.code, message: err.message });
        } else if (!cancelled) {
          setLoadError({
            code: "server_error",
            message: "Something went wrong. Please try again later.",
          });
        }
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    setStep((prev) => Math.min(prev, totalSteps - 1));
  }, [totalSteps]);

  useEffect(() => {
    return () => {
      if (flashTimeout.current) window.clearTimeout(flashTimeout.current);
    };
  }, []);

  const triggerFlash = useCallback((target: "next" | "submit") => {
    if (flashTimeout.current) window.clearTimeout(flashTimeout.current);
    setFlashTarget(null);
    window.setTimeout(() => {
      setFlashTarget(target);
      flashTimeout.current = window.setTimeout(() => setFlashTarget(null), 450);
    }, 0);
  }, []);

  const handleNext = useCallback(() => {
    setShowErrors(true);
    if (!currentStepValid || submitState === "submitting") return;
    setShowErrors(false);
    setSubmitError(null);
    setStep((prev) => Math.min(prev + 1, totalSteps - 1));
  }, [currentStepValid, submitState, totalSteps]);

  const handleBack = useCallback(() => {
    setShowErrors(false);
    setSubmitError(null);
    setStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setShowErrors(true);
      if (!token || !form) return;
      if (!isAddQuestionStep || !submitArmed) return;
      if (!isValid || submitState === "submitting") return;

      setSubmitState("submitting");
      setSubmitArmed(false);
      setSubmitError(null);

      const answerList: AnswerInput[] = questions.map((q) => ({
        question_id: q.id,
        answer_value: answers[q.id] ?? "",
      }));
      if (extraQuestionText.trim() && extraQuestionAnswer.trim()) {
        answerList.push({
          question_id: null,
          question_text: extraQuestionText.trim(),
          answer_value: extraQuestionAnswer.trim(),
        });
      }

      submitFeedback(token, { answers: answerList })
        .then(() => {
          setSubmitState("success");
        })
        .catch((err) => {
          setSubmitState("idle");
          setSubmitArmed(true);
          if (err instanceof FeedbackError) {
            setSubmitError(err.message);
          } else {
            setSubmitError("Something went wrong. Please try again.");
          }
        });
    },
    [
      token,
      form,
      isAddQuestionStep,
      submitArmed,
      isValid,
      submitState,
      questions,
      answers,
      extraQuestionText,
      extraQuestionAnswer,
    ]
  );

  useEffect(() => {
    setSubmitArmed(false);
  }, [step]);

  if (loadState === "loading") {
    return (
      <div className="wof-page">
        <div className="wof-shell">
          <header className="wof-header">
            <div className="wof-logo" aria-hidden="true">
              FM360
            </div>
            <div>
              <p className="wof-eyebrow">Work Order Feedback</p>
              <h1>Loading...</h1>
            </div>
          </header>
          <main className="wof-card">
            <p className="wof-meta" aria-live="polite">
              Loading your feedback form.
            </p>
          </main>
        </div>
      </div>
    );
  }

  if (loadState === "error" && loadError) {
    const isAlreadySubmitted = loadError.code === "already_submitted";
    return (
      <div className="wof-page">
        <div className="wof-shell">
          <header className="wof-header">
            <div className="wof-logo" aria-hidden="true">
              FM360
            </div>
            <div>
              <p className="wof-eyebrow">Work Order Feedback</p>
              <h1>{isAlreadySubmitted ? "Already submitted" : "Link invalid"}</h1>
            </div>
          </header>
          <main className="wof-card">
            <p className="wof-meta" role="alert">
              {loadError.message}
            </p>
          </main>
        </div>
      </div>
    );
  }

  if (!form || questions.length === 0) {
    return (
      <div className="wof-page">
        <div className="wof-shell">
          <header className="wof-header">
            <div className="wof-logo" aria-hidden="true">
              FM360
            </div>
            <div>
              <p className="wof-eyebrow">Work Order Feedback</p>
              <h1>No questions</h1>
            </div>
          </header>
          <main className="wof-card">
            <p className="wof-meta">There are no questions configured for this feedback link.</p>
          </main>
        </div>
      </div>
    );
  }

  const ratingError = showErrors && currentQuestion?.question_type === "rating" && !hasCurrentAnswer;
  const questionError =
    showErrors && currentQuestion && currentQuestion.question_type !== "rating" && !hasCurrentAnswer;

  return (
    <div className="wof-page">
      <div className="wof-shell">
        <header className="wof-header">
          <div className="wof-logo" aria-hidden="true">
            FM360
          </div>
          <div>
            <p className="wof-eyebrow">Work Order Feedback</p>
            <h1>We value your experience</h1>
          </div>
        </header>

        <main className="wof-card" aria-live="polite">
          {step === 0 && (
            <p className="wof-intro">
              <span className="wof-intro-line">
                Work Order <strong>#{workOrderId}</strong>
              </span>
              <span className="wof-intro-line">
                Your input helps us improve reliability and patient safety.
              </span>
            </p>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {!isSuccessStep && (
              <section className="wof-section wof-progress">
                <span className="wof-meta">
                  Step {step + 1} of {progressTotalSteps}
                </span>
              </section>
            )}

            {currentQuestion && (
              <section className="wof-section">
                {currentQuestion.question_type === "rating" && (
                  <fieldset className="wof-fieldset">
                    <legend>{currentQuestion.question_text}</legend>
                    <div className="wof-stars-row">
                      <div className="wof-stars" role="radiogroup">
                        {([1, 2, 3, 4, 5] as const).map((value) => (
                          <label key={value} className="wof-star">
                            <input
                              type="radio"
                              name={`q-${currentQuestion.id}`}
                              value={String(value)}
                              checked={answers[currentQuestion.id] === String(value)}
                              onChange={() =>
                                setAnswers((prev) => ({
                                  ...prev,
                                  [currentQuestion.id]: String(value),
                                }))
                              }
                              aria-label={`${value} star${value > 1 ? "s" : ""}`}
                            />
                            <span aria-hidden="true">★</span>
                          </label>
                        ))}
                      </div>
                      {answers[currentQuestion.id] && (
                        <span className="wof-rating-text" role="status">
                          {RATING_LABELS[Number(answers[currentQuestion.id])]}
                        </span>
                      )}
                    </div>
                    {ratingError && (
                      <p className="wof-error" role="alert">
                        Please select a rating.
                      </p>
                    )}
                  </fieldset>
                )}

                {currentQuestion.question_type === "multiple_choice" && (
                  <fieldset className="wof-fieldset">
                    <legend>{currentQuestion.question_text}</legend>
                    <div className="wof-options">
                      {(currentQuestion.options ?? []).map((optionValue, idx) => {
                        const tone = getOptionTone(idx, currentQuestion.options!.length);
                        return (
                          <label
                            key={optionValue}
                            className={[
                              "wof-option",
                              `wof-option--${tone}`,
                              answers[currentQuestion.id] === optionValue ? "is-selected" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            <input
                              type="radio"
                              name={`q-${currentQuestion.id}`}
                              value={optionValue}
                              checked={answers[currentQuestion.id] === optionValue}
                              onChange={() =>
                                setAnswers((prev) => ({
                                  ...prev,
                                  [currentQuestion.id]: optionValue,
                                }))
                              }
                            />
                            <span>{optionValue}</span>
                          </label>
                        );
                      })}
                    </div>
                    {questionError && (
                      <p className="wof-error" role="alert">
                        Please select an option to continue.
                      </p>
                    )}
                  </fieldset>
                )}

                {currentQuestion.question_type === "free_text" && (
                  <fieldset className="wof-fieldset">
                    <legend>{currentQuestion.question_text}</legend>
                    <textarea
                      className="wof-input"
                      rows={4}
                      placeholder="Your response (optional)"
                      value={answers[currentQuestion.id] ?? ""}
                      onChange={(e) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [currentQuestion.id]: e.target.value,
                        }))
                      }
                    />
                  </fieldset>
                )}
              </section>
            )}

            {isAddQuestionStep && (
              <>
                <section className="wof-section">
                  <div className="wof-section-header">
                    <div className="wof-section-title">
                      <h2>Add a question</h2>
                      <span className="wof-badge">Optional</span>
                    </div>
                    <span className="wof-meta">
                      You can skip this and submit without adding anything.
                    </span>
                  </div>
                  <p className="wof-meta">
                    You can still go back to make changes before submitting.
                  </p>
                </section>
                <section className="wof-section">
                  <label className="wof-label" htmlFor="extra-question-text">
                    Your question
                  </label>
                  <input
                    id="extra-question-text"
                    className="wof-input"
                    type="text"
                    placeholder="Enter your question"
                    value={extraQuestionText}
                    onChange={(e) => setExtraQuestionText(e.target.value)}
                  />
                  <label className="wof-label" htmlFor="extra-question-answer" style={{ marginTop: 12 }}>
                    Your answer
                  </label>
                  <input
                    id="extra-question-answer"
                    className="wof-input"
                    type="text"
                    placeholder="Enter your answer"
                    value={extraQuestionAnswer}
                    onChange={(e) => setExtraQuestionAnswer(e.target.value)}
                  />
                </section>
              </>
            )}

            {submitError && (
              <p className="wof-error" role="alert" style={{ marginBottom: 12 }}>
                {submitError}
              </p>
            )}

            {!isSuccessStep ? (
              <div className="wof-actions">
                <div className="wof-nav">
                  <button
                    type="button"
                    className="wof-button wof-button--secondary"
                    onClick={handleBack}
                    disabled={step === 0 || submitState === "submitting"}
                  >
                    Back
                  </button>
                  {isAddQuestionStep ? (
                    <button
                      type="submit"
                      className={[
                        "wof-button",
                        flashTarget === "submit" ? "is-heartbeat" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => {
                        setSubmitArmed(true);
                        triggerFlash("submit");
                      }}
                      disabled={submitState === "submitting" || !isValid}
                    >
                      {submitState === "submitting" ? (
                        <span className="wof-loading" role="status">
                          Sending...
                        </span>
                      ) : (
                        "Submit feedback"
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={[
                        "wof-button",
                        flashTarget === "next" ? "is-heartbeat" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => {
                        triggerFlash("next");
                        handleNext();
                      }}
                      disabled={submitState === "submitting"}
                    >
                      {step === 0 ? "Start" : "Next"}
                    </button>
                  )}
                </div>
                <p className="wof-hint">
                  Responses are reviewed in aggregate for learning — not performance evaluation.
                </p>
              </div>
            ) : (
              <div className="wof-success" role="status">
                Thanks for taking a moment to share feedback.
              </div>
            )}
          </form>
        </main>
      </div>
    </div>
  );
}
