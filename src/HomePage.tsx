import "./work-order-feedback.css";

export default function HomePage() {
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
        <main className="wof-card">
          <p className="wof-meta">
            Use the feedback link shared with you to submit your response. If you don’t have a link, please request one from your facility admin.
          </p>
        </main>
      </div>
    </div>
  );
}
