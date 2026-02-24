import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import "./work-order-feedback.css";

type ChoiceOption = {
  value: string;
  tone: "positive" | "neutral" | "negative" | "warning";
};

type ChoiceQuestion = {
  id: string;
  label: string;
  options: ChoiceOption[];
};

const RATING_LABELS: Record<number, string> = {
  1: "Very dissatisfied",
  2: "Dissatisfied",
  3: "Neutral",
  4: "Satisfied",
  5: "Very satisfied",
};

const INITIAL_QUESTIONS: ChoiceQuestion[] = [
  {
    id: "care-support",
    label: "Did the environment support safe patient care today?",
    options: [
      { value: "No", tone: "negative" },
      { value: "Somewhat", tone: "warning" },
      { value: "Yes", tone: "positive" },
    ],
  },
  {
    id: "disruption",
    label: "Did Facilities issues delay or disrupt clinical work today?",
    options: [
      { value: "Yes, caused disruption", tone: "negative" },
      { value: "Minor impact", tone: "warning" },
      { value: "No disruption", tone: "positive" },
    ],
  },
  {
    id: "trust",
    label: "Do you trust Facilities to resolve issues reliably when needed?",
    options: [
      { value: "Low trust", tone: "negative" },
      { value: "Neutral", tone: "neutral" },
      { value: "High trust", tone: "positive" },
    ],
  },
  {
    id: "timely-response",
    label: "Was the response time acceptable for this work order?",
    options: [
      { value: "No", tone: "negative" },
      { value: "Somewhat", tone: "warning" },
      { value: "Yes", tone: "positive" },
    ],
  },
  {
    id: "communication",
    label: "Were updates and communication clear during the process?",
    options: [
      { value: "No", tone: "negative" },
      { value: "Somewhat", tone: "warning" },
      { value: "Yes", tone: "positive" },
    ],
  },
];

export default function WorkOrderFeedbackPage() {
  const [rating, setRating] = useState<number | null>(null);
  const [questions, setQuestions] =
    useState<ChoiceQuestion[]>(INITIAL_QUESTIONS);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [newQuestionLabel, setNewQuestionLabel] = useState("");
  const [newOptions, setNewOptions] = useState([
    { value: "Yes", tone: "positive" as ChoiceOption["tone"] },
    { value: "Somewhat", tone: "warning" as ChoiceOption["tone"] },
    { value: "No", tone: "negative" as ChoiceOption["tone"] },
  ]);
  const [step, setStep] = useState(0);
  const [flashTarget, setFlashTarget] = useState<"next" | "submit" | null>(
    null
  );
  const [submitState, setSubmitState] = useState<
    "idle" | "submitting" | "success"
  >("idle");
  const [showErrors, setShowErrors] = useState(false);
  const [submitArmed, setSubmitArmed] = useState(false);
  const flashTimeout = useRef<number | null>(null);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const hasRating = rating !== null;
  const totalSteps = 1 + questions.length + 2;
  const isRatingStep = step === 0;
  const isQuestionStep = step > 0 && step <= questions.length;
  const questionIndex = isQuestionStep ? step - 1 : -1;
  const activeQuestion = isQuestionStep ? questions[questionIndex] : null;
  const finalStep = questions.length + 1;
  const successStep = questions.length + 2;
  const isFinalStep = step === finalStep;
  const isSuccessStep = step === successStep;
  const isValid = hasRating && answeredCount === questions.length;
  const progressTotalSteps = totalSteps - 1;

  const currentStepValid = isRatingStep
    ? hasRating
    : isQuestionStep
    ? Boolean(activeQuestion && answers[activeQuestion.id])
    : true;

  useEffect(() => {
    setSubmitArmed(false);
  }, [step]);

  useEffect(() => {
    setStep((prev) => Math.min(prev, successStep));
    setAnswers((prev) => {
      const next: Record<string, string> = {};
      questions.forEach((question) => {
        const current = prev[question.id];
        if (current) {
          next[question.id] = current;
        }
      });
      return next;
    });
  }, [questions, successStep]);

  useEffect(() => {
    return () => {
      if (flashTimeout.current) {
        window.clearTimeout(flashTimeout.current);
      }
    };
  }, []);

  const triggerFlash = (target: "next" | "submit") => {
    if (flashTimeout.current) {
      window.clearTimeout(flashTimeout.current);
    }
    setFlashTarget(null);
    window.setTimeout(() => {
      setFlashTarget(target);
      flashTimeout.current = window.setTimeout(() => {
        setFlashTarget(null);
      }, 450);
    }, 0);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowErrors(true);

    if (!isFinalStep || !submitArmed) {
      return;
    }

    if (!isValid || submitState === "submitting") {
      return;
    }

    setSubmitState("submitting");
    setSubmitArmed(false);

    const payload = {
      workOrderId: "WO-12345",
      rating,
      answers,
      submittedAt: new Date().toISOString(),
    };

    // Mock API call placeholder. Replace with a real API request.
    window.setTimeout(() => {
      void payload;
      setSubmitState("success");
      setStep(successStep);
    }, 900);
  };

  const ratingError = showErrors && isRatingStep && !hasRating;
  const questionError =
    showErrors &&
    isQuestionStep &&
    Boolean(activeQuestion && !answers[activeQuestion.id]);

  const handleNext = () => {
    setShowErrors(true);
    if (!currentStepValid || submitState === "submitting") {
      return;
    }
    setShowErrors(false);
    setStep((prev) => Math.min(prev + 1, totalSteps - 1));
  };

  const handleBack = () => {
    setShowErrors(false);
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const createId = () => `q-${Date.now()}-${Math.floor(Math.random() * 1000)}`;


  const updateNewOptionValue = (index: number, value: string) => {
    setNewOptions((prev) =>
      prev.map((option, optionIndex) =>
        optionIndex === index ? { ...option, value } : option,
      ),
    );
  };

  const updateNewOptionTone = (
    index: number,
    tone: ChoiceOption["tone"],
  ) => {
    setNewOptions((prev) =>
      prev.map((option, optionIndex) =>
        optionIndex === index ? { ...option, tone } : option,
      ),
    );
  };

  const addNewOption = () => {
    setNewOptions((prev) => [
      ...prev,
      { value: "New option", tone: "neutral" },
    ]);
  };

  const removeNewOption = (index: number) => {
    setNewOptions((prev) =>
      prev.filter((_, optionIndex) => optionIndex !== index),
    );
  };

  const handleAddNewQuestion = () => {
    const label = newQuestionLabel.trim();
    if (!label) {
      return;
    }
    const id = createId();
    const nextStep = questions.length + 1;
    setQuestions((prev) => [
      ...prev,
      {
        id,
        label,
        options: newOptions.map((option) => ({
          value: option.value.trim() || "Option",
          tone: option.tone,
        })),
      },
    ]);
    setStep(nextStep);
    setNewQuestionLabel("");
    setNewOptions([
      { value: "Yes", tone: "positive" },
      { value: "Somewhat", tone: "warning" },
      { value: "No", tone: "negative" },
    ]);
  };

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
          {isRatingStep ? (
            <p className="wof-intro">
              <span className="wof-intro-line">
                Work Order <strong>#WO-12345</strong> | Room <strong>9B</strong>{" "}
                | <strong>HVAC</strong>
              </span>
              <span className="wof-intro-line">
                Your input helps us improve reliability and patient safety.
              </span>
            </p>
          ) : null}

          <form onSubmit={handleSubmit} noValidate>
            {!isSuccessStep ? (
              <section className="wof-section wof-progress">
                <span className="wof-meta">
                  Step {step + 1} of {progressTotalSteps}
                </span>
              </section>
            ) : null}

            {isRatingStep ? (
              <section className="wof-section">
                <fieldset className="wof-fieldset">
                  <legend>Overall satisfaction</legend>
                  <div className="wof-stars-row">
                    <div className="wof-stars" role="radiogroup">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <label key={value} className="wof-star">
                          <input
                            type="radio"
                            name="overallRating"
                            value={value}
                            checked={rating === value}
                            onChange={() => {
                              setRating(value);
                            }}
                            aria-label={`${value} star${value > 1 ? "s" : ""}`}
                          />
                          <span aria-hidden="true">★</span>
                        </label>
                      ))}
                    </div>
                    {rating !== null ? (
                      <span className="wof-rating-text" role="status">
                        {RATING_LABELS[rating]}
                      </span>
                    ) : null}
                  </div>
                  {ratingError ? (
                    <p className="wof-error" role="alert">
                      Please select a rating.
                    </p>
                  ) : null}
                </fieldset>
              </section>
            ) : null}

            {isQuestionStep && activeQuestion ? (
              <section className="wof-section">
                <div className="wof-section-header">
                  <h2>Quick check-in</h2>
                  <span className="wof-meta">
                    Answer each question to continue
                  </span>
                </div>
                <fieldset className="wof-fieldset">
                  <legend>{activeQuestion.label}</legend>
                  <div className="wof-options">
                    {activeQuestion.options.map((option) => (
                      <label
                        key={option.value}
                        className={[
                          "wof-option",
                          `wof-option--${option.tone}`,
                          answers[activeQuestion.id] === option.value
                            ? "is-selected"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <input
                          type="radio"
                          name={`question-${activeQuestion.id}`}
                          value={option.value}
                          checked={answers[activeQuestion.id] === option.value}
                          onChange={() => {
                            setAnswers((prev) => ({
                              ...prev,
                              [activeQuestion.id]: option.value,
                            }));
                          }}
                        />
                        <span>{option.value}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {questionError ? (
                  <p className="wof-error" role="alert">
                    Please answer this question to continue.
                  </p>
                ) : null}
              </section>
            ) : null}

            {isFinalStep ? (
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
                  <label className="wof-label" htmlFor="new-question">
                    Question text
                  </label>
                  <input
                    id="new-question"
                    className="wof-input"
                    type="text"
                    placeholder="Enter your question"
                    value={newQuestionLabel}
                    onChange={(event) =>
                      setNewQuestionLabel(event.target.value)
                    }
                  />
                  <div className="wof-editor-options">
                    {newOptions.map((option, optionIndex) => (
                      <div
                        key={`new-${optionIndex}`}
                        className={`wof-editor-option wof-editor-option--${option.tone}`}
                      >
                        <input
                          className="wof-input"
                          type="text"
                          value={option.value}
                          onChange={(event) =>
                            updateNewOptionValue(
                              optionIndex,
                              event.target.value,
                            )
                          }
                        />
                        <select
                          className="wof-select"
                          value={option.tone}
                          onChange={(event) =>
                            updateNewOptionTone(
                              optionIndex,
                              event.target.value as ChoiceOption["tone"],
                            )
                          }
                        >
                          <option value="positive">Positive</option>
                          <option value="neutral">Neutral</option>
                          <option value="warning">Warning</option>
                          <option value="negative">Negative</option>
                        </select>
                        <button
                          type="button"
                          className="wof-button wof-button--ghost"
                          onClick={() => removeNewOption(optionIndex)}
                          disabled={newOptions.length <= 2}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <div className="wof-editor-row">
                      <button
                        type="button"
                        className="wof-button wof-button--secondary wof-button--compact"
                        onClick={addNewOption}
                      >
                        Add option
                      </button>
                      <button
                        type="button"
                        className="wof-button wof-button--compact"
                        onClick={handleAddNewQuestion}
                      >
                        Add question
                      </button>
                    </div>
                  </div>
                </section>
              </>
            ) : null}

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
                  {isFinalStep ? (
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
                      {isRatingStep ? "Start" : "Next"}
                    </button>
                  )}
                </div>
                <p className="wof-hint">
                  Responses are reviewed in aggregate for learning — not
                  performance evaluation.
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
