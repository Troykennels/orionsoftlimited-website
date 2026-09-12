// Default document templates and simple {{placeholder}} interpolation.
// Admins can edit these (stored under orionsoft:templates:*); these are the
// seed content used the first time each type is composed. Bodies support a
// small set of formatting tags (see api/_lib/richtext.js): <b>, <i>, <br>,
// <p>/<div>, <ul>/<ol>/<li> — anything else is stripped, not shown literally.

export const TEMPLATE_TYPES = ["offer_letter", "nda", "service_contract", "payslip_receipt", "onboarding_letter"];

export const DEFAULT_TEMPLATES = {
  offer_letter: {
    name: "Offer Letter",
    bodyMarkup:
`<p>Dear {{recipientName}},</p>

<p>We are pleased to offer you the position of <b>{{role}}</b> at Orion Soft Limited, reporting to the {{department}} team, effective <b>{{startDate}}</b>.</p>

<p>Your compensation will be <b>{{salaryCurrency}} {{salaryAmount}}</b> per annum, payable in accordance with our standard payroll schedule.</p>

<p>This offer is contingent upon your acceptance of our standard terms of employment. Please confirm your acceptance by signing below.</p>

<p>We look forward to welcoming you to the team.</p>

<p>Yours sincerely,</p>`,
  },
  nda: {
    name: "Non-Disclosure Agreement",
    bodyMarkup:
`<p>This Non-Disclosure Agreement ("Agreement") is entered into between <b>Orion Soft Limited</b> ("Company") and {{recipientName}} ("Recipient").</p>

<p><b>1. Confidentiality.</b> The Recipient agrees to hold in confidence all proprietary and confidential information disclosed by the Company.</p>

<p><b>2. Non-Disclosure.</b> The Recipient shall not disclose such information to any third party without prior written consent.</p>

<p><b>3. Duration.</b> This obligation survives termination of any engagement between the parties.</p>

<p>By signing below, the Recipient agrees to the terms of this Agreement.</p>`,
  },
  service_contract: {
    name: "Service / Client Contract",
    bodyMarkup:
`<p>This Service Agreement is made between <b>Orion Soft Limited</b> ("Provider") and {{recipientName}} ("Client").</p>

<p><b>1. Scope of Work.</b> {{scopeOfWork}}</p>

<p><b>2. Fees.</b> The total contract value is <b>{{currency}} {{amount}}</b>, payable per the milestone schedule agreed between both parties.</p>

<p><b>3. Governing Law.</b> This Agreement is governed by the laws of the Federal Republic of Nigeria.</p>

<p>By signing below, the Client agrees to the terms of this Agreement.</p>`,
  },
  payslip_receipt: {
    name: "Payslip Receipt",
    bodyMarkup:
`<p>This confirms that <b>{{recipientName}}</b> was paid <b>{{currency}} {{amount}}</b> for the period {{period}}, in accordance with their employment terms at Orion Soft Limited.</p>`,
  },
  onboarding_letter: {
    name: "Onboarding Letter",
    bodyMarkup:
`<p>Dear {{recipientName}},</p>

<p>Welcome to Orion Soft Limited! We're excited to have you join us as <b>{{role}}</b>.</p>

<p>Your first day is <b>{{startDate}}</b>. Please find enclosed important information to help you settle in:</p>

<ul>
<li>Your staff portal login details, sent separately by email</li>
<li>Submitting your first weekly report at the end of your first week</li>
<li>Reaching out to your manager or HR with any questions</li>
</ul>

<p>If you have any questions before your start date, please don't hesitate to reach out.</p>

<p>Welcome aboard!</p>`,
  },
};

export function renderTemplate(bodyMarkup, data = {}) {
  return String(bodyMarkup).replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key) => (data[key] != null ? String(data[key]) : `{{${key}}}`));
}
