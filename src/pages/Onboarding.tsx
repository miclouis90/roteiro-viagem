import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CalendarDays, Compass, MapPin, Users, WalletCards } from "lucide-react";
import "./Onboarding.css";
const steps = [
  { title: "Planeje do seu jeito", text: "Organize dias, lugares e ideias sem complicação.", icon: MapPin },
  { title: "Construa a viagem junto", text: "Convide quem vai com você e montem o roteiro em tempo real.", icon: Users },
  { title: "Tudo da viagem em um só lugar", text: "Roteiro, lugares e gastos sempre à mão.", icon: WalletCards },
];
export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const title = useRef<HTMLHeadingElement>(null);
  const current = steps[step];
  const Icon = current.icon;
  const finish = () => { onComplete(); navigate("/", { replace: true }); };
  useEffect(() => { title.current?.focus({ preventScroll: true }); }, [step]);
  return <main className="onboarding" aria-label="Boas-vindas ao Rumo">
    <div className="onboarding-inner">
      <header className="onboarding-top"><span className="onboarding-brand"><Compass size={30} strokeWidth={1.7} aria-hidden="true" />rumo.</span><button className="onboarding-skip" onClick={finish}>Pular</button></header>
      <div className={`onboarding-art onboarding-art-${step}`} aria-hidden="true">
        <div className="onboarding-orbit" /><div className="onboarding-orbit onboarding-orbit-second" />
        <span className="onboarding-pin"><Icon size={54} strokeWidth={1.3} /></span>
        <span className="onboarding-satellite"><CalendarDays size={24} strokeWidth={1.5}/></span>
        <span className="onboarding-dot" />
      </div>
      <section className="onboarding-message"><h1 ref={title} tabIndex={-1}>{current.title}</h1><p>{current.text}</p></section>
      <div className="onboarding-progress" role="group" aria-label={`Etapa ${step + 1} de 3`}>{steps.map((item, index) => <button key={item.title} aria-label={`Ir para etapa ${index+1}: ${item.title}`} aria-current={step === index ? "step" : undefined} onClick={() => setStep(index)}><span /></button>)}</div>
      <button className="onboarding-next" onClick={() => step === steps.length - 1 ? finish() : setStep(step+1)}>{step === steps.length - 1 ? "Começar" : "Continuar"}<ArrowRight size={19} aria-hidden="true" /></button>
      <div className="onboarding-back-slot">{step > 0 && <button className="onboarding-back" onClick={() => setStep(step-1)}><ArrowLeft size={16} aria-hidden="true" />Voltar</button>}</div>
    </div>
  </main>;
}
