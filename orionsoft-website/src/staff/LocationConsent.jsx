import { C } from "./theme.js";
import { Btn, Modal } from "./components.jsx";

export default function LocationConsent({ onAccept, onClose }) {
  return (
    <Modal title="How location is used" onClose={onClose} width={520}>
      <div style={{ fontSize: 14, color: C.text, lineHeight: 1.7 }}>
        <p style={{ marginTop: 0 }}>To verify field work fairly, the Staff Office records your location <strong>only at these moments</strong>:</p>
        <ul style={{ paddingLeft: 18, margin: "0 0 12px" }}>
          <li>when you clock in and clock out,</li>
          <li>when you check in and out of a client visit,</li>
          <li>when you answer a location check.</li>
        </ul>
        <p>It is <strong>never tracked in the background</strong>. You, your line manager, HR and management can see these records, and you can see everything recorded about you under Field Visits and Performance. This follows the Nigeria Data Protection Act 2023.</p>
      </div>
      <Btn onClick={onAccept}>I understand, continue</Btn>
    </Modal>
  );
}
