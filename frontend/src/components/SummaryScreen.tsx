import { Download, Trash2 } from "lucide-react";
import type { CallSessionState } from "@accesscall/shared";

interface SummaryScreenProps {
  session?: CallSessionState;
  transcriptUrl?: string;
  onDeleteTranscript(): void;
  onNewCall(): void;
}

export function SummaryScreen({ session, transcriptUrl, onDeleteTranscript, onNewCall }: SummaryScreenProps) {
  if (!session?.summary) {
    return (
      <section className="screen">
        <p>Complete a call to generate a summary.</p>
      </section>
    );
  }

  return (
    <section className="screen" aria-labelledby="summaryTitle">
      <div className="section-heading">
        <div>
          <p className="eyebrow">After-call record</p>
          <h2 id="summaryTitle">Outcome and next steps</h2>
        </div>
        <div className="pill">{session.status}</div>
      </div>

      <div className="summary-grid">
        <section className="panel accent-panel">
          <h3>Outcome</h3>
          <p className="large-body">{session.summary.outcome}</p>
        </section>
        <section className="panel">
          <h3>Key details</h3>
          <dl className="detail-list">
            {session.summary.keyDetails.map((detail) => (
              <div key={detail.label} className="detail-row">
                <dt>{detail.label}</dt>
                <dd>{detail.value}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="panel">
          <h3>Next steps</h3>
          <ul className="check-list">
            {session.summary.nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </section>
        <section className="panel">
          <h3>Transcript privacy</h3>
          <p>{session.summary.transcriptSaved ? "Transcript saved for this session." : "Transcript not saved."}</p>
          <div className="stacked-actions">
            <a className={`button button-secondary ${session.transcript.length ? "" : "is-disabled"}`} href={transcriptUrl}>
              <Download size={18} aria-hidden="true" />
              Download transcript
            </a>
            <button className="button button-danger" type="button" onClick={onDeleteTranscript} disabled={!session.transcript.length}>
              <Trash2 size={18} aria-hidden="true" />
              Delete transcript
            </button>
          </div>
        </section>
        <section className="panel span-2">
          <h3>Transcript</h3>
          <div className={`summary-transcript ${session.transcript.length ? "" : "is-empty"}`}>
            {session.transcript.length
              ? session.transcript.map((entry) => (
                  <p key={entry.id}>
                    <strong>{entry.speaker}:</strong> {entry.text}
                  </p>
                ))
              : "No saved transcript."}
          </div>
        </section>
      </div>

      <div className="form-actions">
        <button className="button button-primary" type="button" onClick={onNewCall}>
          Create another call
        </button>
      </div>
    </section>
  );
}
