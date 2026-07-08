const steps = [
  { id: "request", label: "Request" },
  { id: "plan", label: "Plan" },
  { id: "live", label: "Call" },
  { id: "summary", label: "Summary" },
] as const;

export type StepId = (typeof steps)[number]["id"];

interface StepperProps {
  activeStep: StepId;
  onStepChange(step: StepId): void;
}

export function Stepper({ activeStep, onStepChange }: StepperProps) {
  return (
    <nav className="stepper" aria-label="Call workflow">
      {steps.map((step, index) => {
        return (
          <button
            key={step.id}
            type="button"
            className={`step ${activeStep === step.id ? "is-active" : ""}`}
            onClick={() => onStepChange(step.id)}
            aria-current={activeStep === step.id ? "step" : undefined}
          >
            <span className="step-index">{index + 1}</span>
            <span>{step.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
