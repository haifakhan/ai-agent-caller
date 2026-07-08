import {
  CircleDollarSign,
  HelpCircle,
  Mail,
  Pause,
  Play,
  RotateCcw,
  Send,
  Square,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ApprovalStatus, CallSessionState, LiveControl } from "@accesscall/shared";

interface LiveCallScreenProps {
  session?: CallSessionState;
  onControl(control: LiveControl): void;
  onInstruction(text: string): void;
  onApproval(decision: ApprovalStatus): void;
}

export function LiveCallScreen({ session, onControl, onInstruction, onApproval }: LiveCallScreenProps) {
  const [instruction, setInstruction] = useState("");
  const pending = session?.pendingApproval?.status === "pending" ? session.pendingApproval : undefined;
  const paused = session?.status === "paused";
  const elapsed = useElapsed(session?.startedAt, session?.endedAt);

  if (!session) {
    return (
      <section className="screen">
        <p>Start a call to see the live transcript.</p>
      </section>
    );
  }

  return (
    <section className="screen live-screen" aria-labelledby="liveTitle">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Supervised live call</p>
          <h2 id="liveTitle">Transcript and controls</h2>
        </div>
        <div className="call-meter">
          <span className="pill pill-live">{session.status.replace("_", " ")}</span>
          <span>{elapsed}</span>
        </div>
      </div>

      <div className="live-grid">
        <section className="transcript-panel">
          <h3>Live transcript</h3>
          <div className="transcript-log" aria-live="polite" aria-relevant="additions">
            {session.transcript.length ? (
              session.transcript.map((entry) => (
                <article key={entry.id} className={`message ${entry.speaker}`}>
                  <div className="message-meta">
                    <span>{label(entry.speaker)}</span>
                    <time>{new Date(entry.timestamp).toLocaleTimeString()}</time>
                  </div>
                  <p>{entry.text}</p>
                </article>
              ))
            ) : (
              <div className="transcript-empty">Transcript appears here once the call connects.</div>
            )}
          </div>
        </section>

        <aside className="control-rail">
          <section className="current-response">
            <h3>AI response state</h3>
            <p>{session.currentResponse}</p>
          </section>

          {pending ? (
            <section className="approval-gate">
              <h3>Approval needed</h3>
              <p>{pending.prompt}</p>
              <p className="proposed-line">{pending.proposedText}</p>
              <div className="stacked-actions">
                <button className="button button-primary" type="button" onClick={() => onApproval("approved")}>
                  Approve
                </button>
                <button className="button button-secondary" type="button" onClick={() => onApproval("alternative")}>
                  Ask for alternative
                </button>
                <button className="button button-danger" type="button" onClick={() => onApproval("declined")}>
                  Decline
                </button>
              </div>
            </section>
          ) : null}

          <div className="control-grid" aria-label="Quick controls">
            <ControlButton icon={<RotateCcw size={18} />} label="Repeat" onClick={() => onControl("repeat")} />
            <ControlButton icon={<HelpCircle size={18} />} label="Clarify" onClick={() => onControl("clarify")} />
            <ControlButton icon={<CircleDollarSign size={18} />} label="Ask price" onClick={() => onControl("price")} />
            <ControlButton icon={<Mail size={18} />} label="Ask email" onClick={() => onControl("email")} />
            <ControlButton icon={<XCircle size={18} />} label="Do not agree" danger onClick={() => onControl("dontAgree")} />
            <ControlButton
              icon={paused ? <Play size={18} /> : <Pause size={18} />}
              label={paused ? "Resume" : "Pause"}
              onClick={() => onControl(paused ? "resume" : "pause")}
            />
          </div>

          <form
            className="instruction-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (instruction.trim()) {
                onInstruction(instruction.trim());
                setInstruction("");
              }
            }}
          >
            <label htmlFor="typedInstruction">Type an instruction</label>
            <textarea
              id="typedInstruction"
              rows={3}
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              placeholder="Ask whether Thursday after 1 PM is available."
            />
            <button className="button button-primary" type="submit">
              <Send size={18} aria-hidden="true" />
              Send instruction
            </button>
          </form>

          <button className="button button-danger full-width" type="button" onClick={() => onControl("end")}>
            <Square size={18} aria-hidden="true" />
            End call
          </button>
        </aside>
      </div>
    </section>
  );
}

function ControlButton({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick(): void;
}) {
  return (
    <button type="button" className={`control-button ${danger ? "danger" : ""}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function label(speaker: string): string {
  return {
    accesscall: "AccessCall",
    other: "Other party",
    user: "You",
    system: "System",
  }[speaker] ?? speaker;
}

function useElapsed(startedAt?: string, endedAt?: string): string {
  return useMemo(() => {
    if (!startedAt) {
      return "00:00";
    }
    const end = endedAt ? new Date(endedAt).getTime() : Date.now();
    const total = Math.max(0, Math.floor((end - new Date(startedAt).getTime()) / 1000));
    const minutes = String(Math.floor(total / 60)).padStart(2, "0");
    const seconds = String(total % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [startedAt, endedAt]);
}
