import { ChevronDown } from "lucide-react";
import { emptyCallRequest, type CallRequestInput } from "@accesscall/shared";

interface NewCallFormProps {
  value: CallRequestInput;
  error: string;
  loading: boolean;
  onChange(value: CallRequestInput): void;
  onSubmit(): void;
}

export function NewCallForm({ value, error, loading, onChange, onSubmit }: NewCallFormProps) {
  function update<K extends keyof CallRequestInput>(key: K, nextValue: CallRequestInput[K]) {
    onChange({ ...value, [key]: nextValue });
  }

  return (
    <section className="screen new-call-screen" aria-labelledby="requestTitle">
      <div className="section-heading">
        <div>
          <h2 id="requestTitle">New call</h2>
            <p>Share what you need in simple words. You can review and approve everything before the call starts.</p>
        </div>
      </div>

      <form
        className="new-call-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Field label="Your name" id="callerName" help="The assistant introduces itself as calling on your behalf.">
          <input
            id="callerName"
            placeholder="e.g. Sam Rivera"
            value={value.callerName}
            onChange={(event) => update("callerName", event.target.value)}
          />
        </Field>

        <div className="dual-field-row">
          <Field label="Phone number to call" id="phoneNumber">
            <input
              id="phoneNumber"
              type="tel"
              placeholder="+1 555 123 4567"
              value={value.phoneNumber}
              onChange={(event) => update("phoneNumber", event.target.value)}
            />
          </Field>
          <Field label="Who is being called" id="organization">
            <input
              id="organization"
              placeholder="e.g. Northside Dental"
              value={value.organization}
              onChange={(event) => update("organization", event.target.value)}
            />
          </Field>
        </div>

        <Field label="What do you need?" id="goal" help="Booking, rescheduling, asking a question - plain language is fine.">
          <textarea
            id="goal"
            rows={4}
            placeholder="Book a cleaning appointment sometime next week, ideally afternoons."
            value={value.goal}
            onChange={(event) => update("goal", event.target.value)}
          />
        </Field>

        <details className="optional-accordion">
          <summary>
            <span>Additional info</span>
            <span className="optional-summary-actions">
              <span className="optional-badge">Optional</span>
              <ChevronDown size={16} aria-hidden="true" />
            </span>
          </summary>

          <div className="optional-grid">
            <Field label="Type of call" id="callType" help="Optional. Leave blank if you're not sure.">
              <select
                id="callType"
                className={value.callType ? "" : "select-placeholder"}
                value={value.callType}
                onChange={(event) => update("callType", event.target.value as CallRequestInput["callType"]) }
              >
                <option value="" disabled>
                  Select a type
                </option>
                <option value="Book an appointment">Book an appointment</option>
                <option>Reschedule an appointment</option>
                <option>Cancel an appointment</option>
                <option>Ask about pricing</option>
                <option>Ask about hours or documents</option>
                <option>Confirm next steps</option>
              </select>
            </Field>

            <Field label="Information the AI can share" id="allowedInfo" help="Only what's needed to complete the task.">
              <textarea
                id="allowedInfo"
                rows={3}
                placeholder="Full name, date of birth, insurance provider, callback email."
                value={value.allowedInfo}
                onChange={(event) => update("allowedInfo", event.target.value)}
              />
            </Field>

            <Field label="Anything to avoid" id="restrictions" help="The assistant will avoid these topics or actions.">
              <textarea
                id="restrictions"
                rows={3}
                placeholder="Don't discuss diagnosis details. Don't agree to extra tests."
                value={value.restrictions}
                onChange={(event) => update("restrictions", event.target.value)}
              />
            </Field>

            <Field label="Preferred options" id="preferredOptions">
              <textarea
                id="preferredOptions"
                rows={2}
                placeholder="Tuesday or Thursday, 2-5pm."
                value={value.preferredOptions}
                onChange={(event) => update("preferredOptions", event.target.value)}
              />
            </Field>

            <Field label="Must confirm before ending" id="mustConfirm">
              <textarea
                id="mustConfirm"
                rows={2}
                placeholder="Date, time, address, reference number."
                value={value.mustConfirm}
                onChange={(event) => update("mustConfirm", event.target.value)}
              />
            </Field>

            <Field label="Things it must never agree to" id="neverAgree" help="Hard boundaries. The AI will refuse and check with you.">
              <textarea
                id="neverAgree"
                rows={3}
                placeholder="No morning appointments. No payment over the phone. No sharing my address."
                value={value.neverAgree}
                onChange={(event) => update("neverAgree", event.target.value)}
              />
            </Field>

            <label className="toggle block-toggle">
              <input
                type="checkbox"
                checked={value.saveTranscriptPreference}
                onChange={(event) => update("saveTranscriptPreference", event.target.checked)}
              />
              <span>Save transcript unless I delete it</span>
            </label>
          </div>
        </details>

        {error ? <div className="safety-warning">{error}</div> : null}

        <div className="new-call-actions">
          <button className="button button-secondary" type="button" onClick={() => onChange(emptyCallRequest)}>
            Cancel
          </button>
          <button className="button button-primary" type="submit" disabled={loading}>
            Generate call plan
          </button>
        </div>
      </form>
    </section>
  );
}

function Field({
  label,
  id,
  help,
  children,
}: {
  label: string;
  id: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {help ? <p className="field-help">{help}</p> : null}
      {children}
    </div>
  );
}
