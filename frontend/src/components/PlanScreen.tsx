import { ChevronDown, Play, ShieldCheck } from "lucide-react";
import type { CallPlan, CallRequest } from "@accesscall/shared";

interface PlanScreenProps {
  request?: CallRequest;
  plan?: CallPlan;
  approved: boolean;
  loading: boolean;
  onApprovedChange(value: boolean): void;
  onBack(): void;
  onStart(): void;
}

export function PlanScreen({ request, plan, approved, loading, onApprovedChange, onBack, onStart }: PlanScreenProps) {
  if (!request || !plan) {
    return (
      <section className="screen">
        <p>Create a call request first.</p>
      </section>
    );
  }

  return (
    <section className="screen" aria-labelledby="planTitle">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Review before calling</p>
          <h2 id="planTitle">Call plan</h2>
          <p>Quick summary of what the assistant will say and what it must check first.</p>
        </div>
        <div className="pill plan-status-pill">
          <ShieldCheck size={18} aria-hidden="true" />
          Waiting for user approval
        </div>
      </div>

      <div className="plan-summary-stack">
        <section className="panel plan-card">
          <div className="panel-title-row">
            <div>
              <h3>Goal</h3>
            </div>
          </div>
          <p className="plan-inline-value">
            <span>Goal:</span>
            <span>{plan.goal}</span>
          </p>
        </section>

        <section className="panel plan-card accent-panel">
          <div className="panel-title-row">
            <div>
              <h3>Opening script</h3>
              <p>What the assistant will say at the start.</p>
            </div>
          </div>
          <div className="script-box">{plan.openingScript}</div>
          <label className="approval-check approval-check-compact">
            <input type="checkbox" checked={approved} onChange={(event) => onApprovedChange(event.target.checked)} />
            <span>I approve this opening script.</span>
          </label>
        </section>

        <details className="plan-details span-2">
          <summary>
            <span>More details</span>
            <ChevronDown size={16} aria-hidden="true" />
          </summary>
          <div className="plan-details-grid">
            <ListPanel title="What it can share" items={plan.allowedInfo} emptyText="No approved details added." />
            <ListPanel title="What needs approval" items={plan.approvals} emptyText="No approval items listed." />
            <ListPanel title="Boundaries" items={plan.boundaries} emptyText="No boundaries listed." />
            <ListPanel title="Fallback response" body={plan.fallbackResponse} />
            <ListPanel title="Next step" body="Review the plan, approve the script, then start the call." />
          </div>
        </details>
      </div>

      <div className="form-actions">
        <button className="button button-secondary" type="button" onClick={onBack}>
          Edit request
        </button>
        <button className="button button-primary" type="button" onClick={onStart} disabled={!approved || loading}>
          <Play size={18} aria-hidden="true" />
          Approve and start call
        </button>
      </div>
    </section>
  );
}

function ListPanel({ title, items, body, emptyText }: { title: string; items?: string[]; body?: string; emptyText?: string }) {
  return (
    <section className="plan-detail-card">
      <h3>{title}</h3>
      {items ? (
        <ul className="check-list">
          {items.length ? (
            <>
              {items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </>
          ) : (
            <li className="plan-empty">{emptyText ?? "Nothing added."}</li>
          )}
        </ul>
      ) : (
        <p className="large-body">{body}</p>
      )}
    </section>
  );
}
