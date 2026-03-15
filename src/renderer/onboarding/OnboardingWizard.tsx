import { useState } from 'react'
import WelcomeStep from './steps/WelcomeStep'
import MicPermissionStep from './steps/MicPermissionStep'
import InputMonitoringStep from './steps/InputMonitoringStep'
import AccessibilityStep from './steps/AccessibilityStep'

interface Props {
  onComplete: () => void
}

export default function OnboardingWizard({ onComplete }: Props) {
  const [step, setStep] = useState(0)

  const handleComplete = async () => {
    await window.dictatelyAPI.updateSettings({ onboardingComplete: true })
    onComplete()
  }

  const steps = [
    <WelcomeStep key="welcome" onNext={() => setStep(1)} />,
    <MicPermissionStep key="mic" onNext={() => setStep(2)} />,
    <InputMonitoringStep key="input" onNext={() => setStep(3)} />,
    <AccessibilityStep key="a11y" onComplete={handleComplete} />
  ]

  return (
    <div className="onboarding">
      <div className="onboarding-content">
        {steps[step]}
        <div className="onboarding-steps">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'completed' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
