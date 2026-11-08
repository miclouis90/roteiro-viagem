import { Compass, Ticket, ChevronRight } from "lucide-react";
import { Modal } from "../Modal";
import "./personal-events.css";
export function NewItemChoice({ canCreateTrip, onTrip, onEvent, onClose }: { canCreateTrip: boolean; onTrip: () => void; onEvent: () => void; onClose: () => void }) {
  return <Modal title="O que vamos planejar?" onClose={onClose}>
    <div className="new-item-choice">
      <button type="button" disabled={!canCreateTrip} onClick={onTrip}><Compass size={27} aria-hidden="true" /><span><strong>Viagem</strong><small>{canCreateTrip ? "Um destino, muitos planos." : "Sua conta não pode criar viagens."}</small></span><ChevronRight size={18} aria-hidden="true" /></button>
      <button type="button" onClick={onEvent}><Ticket size={27} aria-hidden="true" /><span><strong>Evento</strong><small>Show, teatro e outras experiências pessoais.</small></span><ChevronRight size={18} aria-hidden="true" /></button>
    </div>
  </Modal>;
}
