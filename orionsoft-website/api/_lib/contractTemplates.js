// Professional document templates (Nigerian law). The structured parts of an
// agreement (parties, scope, deliverables, term, fees and payment schedule,
// signatures) are generated from the contract's own fields; these bodies are
// the terms and conditions. {{placeholders}} are filled automatically from the
// contract (clientName, companyName, effectiveDate…) or asked for when the
// document is created. {{key|default}} supplies a default value.
//
// kind: "agreement"  → full agreement layout, both parties sign, may carry fees
//       "letter"     → letter layout, recipient signs to accept
//       "certificate"→ issued and signed by Orion Soft only
import { DEFAULT_TEMPLATES } from "./templates.js";

const GOVERNING_LAW = `<p><b>Governing law.</b> This Agreement is governed by the laws of the Federal Republic of Nigeria.</p>
<p><b>Disputes.</b> The parties will first try in good faith to settle any dispute within thirty (30) days of written notice. If it is not settled, either party may refer it to mediation at the Lagos Multi-Door Courthouse and, failing settlement within a further thirty (30) days, to arbitration by a sole arbitrator under the Arbitration and Mediation Act 2023, seated in Lagos and conducted in English. Nothing prevents a party from seeking urgent injunctive relief from a court of competent jurisdiction.</p>`;

const BOILERPLATE = `<p><b>Force majeure.</b> Neither party is liable for delay or failure caused by events beyond its reasonable control (including natural disasters, epidemics, war, civil unrest, government action or failure of public utilities or networks), provided it notifies the other party promptly and resumes performance as soon as practicable.</p>
<p><b>Notices.</b> Notices under this Agreement must be in writing and sent to the email or postal address of the receiving party stated in this Agreement (or later notified in writing). Email notices are received on the next working day after sending.</p>
<p><b>Independent parties.</b> The parties are independent contractors. Nothing in this Agreement creates a partnership, joint venture, agency or employment relationship.</p>
<p><b>Entire agreement and changes.</b> This Agreement, including its schedules, is the entire agreement between the parties on its subject and replaces all earlier discussions. Any change must be agreed in writing and signed by both parties.</p>
<p><b>Severability and waiver.</b> If any provision is found invalid, the rest remains in force. Failure to enforce a right is not a waiver of it.</p>
<p><b>Electronic signature.</b> This Agreement may be signed electronically and in counterparts. Electronic signatures and records are valid and admissible under the Evidence Act 2011, and each signed copy is an original.</p>`;

export const CONTRACT_TEMPLATES = {
  software_development: {
    name: "Software Development Agreement", kind: "agreement", docLabel: "Client Agreement", payable: true, requiresScope: true,
    bodyMarkup:
`<p><b>1. Services.</b> {{companyName}} ("Orion Soft") will design, develop, test and deliver the software described in the Scope of Work and Deliverables above (the "Deliverables"), with reasonable skill, care and diligence and in line with good industry practice.</p>
<p><b>2. Client responsibilities.</b> {{clientName}} (the "Client") will provide the information, content, decisions, approvals, access, credentials and cooperation reasonably required, and will nominate one person with authority to give instructions and approvals. Where the Client's delay or failure affects the work, delivery dates move by a corresponding period and any additional cost is agreed under clause 4.</p>
<p><b>3. Acceptance.</b> On delivery of each milestone, the Client has {{acceptanceDays|10}} working days to test it and either accept it or give written reasons why it does not meet the agreed requirements. Orion Soft will correct genuine non-conformities and resubmit. A milestone is accepted when the Client accepts it in writing, uses it in live operation, or does not respond within the review period.</p>
<p><b>4. Changes to scope.</b> Work outside the agreed Scope of Work requires a written change request. Orion Soft will state the effect on fees and timelines, and the change proceeds only once both parties approve it in writing.</p>
<p><b>5. Fees and payment.</b> The Client will pay the fees in the Fees and Payment section by the due dates shown. Unless stated otherwise, fees exclude VAT (currently 7.5%), which is added where applicable. Payments may be made through the secure payment link or by bank transfer quoting the contract number. If an amount remains unpaid fourteen (14) days after its due date, Orion Soft may, after written notice, pause work until it is paid, and delivery dates move accordingly.</p>
<p><b>6. Intellectual property.</b> On receipt of full payment, the Client owns the Deliverables created specifically for it under this Agreement. Orion Soft keeps ownership of its pre-existing software, frameworks, libraries, tools, know-how and generic components ("Orion Soft Materials") and grants the Client a perpetual, non-exclusive, royalty-free licence to use the Orion Soft Materials included in the Deliverables, solely as part of the Deliverables. Third-party and open-source components remain subject to their own licences. Until full payment, the Client may use the Deliverables for testing and evaluation only.</p>
<p><b>7. Confidentiality.</b> Each party will keep the other's confidential information (including business, technical, financial and customer information) confidential, use it only for this Agreement, and disclose it only to staff and advisers who need to know it and are bound by equivalent duties. This does not apply to information that is public, already known, independently developed, or required to be disclosed by law. This obligation continues for three (3) years after this Agreement ends.</p>
<p><b>8. Data protection.</b> Where Orion Soft processes personal data for the Client, it does so only on the Client's documented instructions, keeps it secure, restricts access to authorised personnel, and complies with the Nigeria Data Protection Act 2023. The Client is responsible for having a lawful basis to collect and share that data.</p>
<p><b>9. Warranty.</b> Orion Soft warrants that for {{warrantyDays|90}} days after acceptance, each Deliverable will perform materially in line with the agreed requirements, and it will fix reported defects free of charge during that period. The warranty does not cover defects caused by changes made by others, misuse, unsupported environments or third-party services. Ongoing support after the warranty period is available under a separate support agreement.</p>
<p><b>10. Limitation of liability.</b> Neither party is liable for indirect or consequential loss, or for loss of profit, revenue, goodwill or data. Each party's total liability under this Agreement is limited to the total fees paid or payable under it. These limits do not apply to fraud, wilful misconduct, breach of confidentiality, infringement of the other party's intellectual property, or liability that cannot be limited by law.</p>
<p><b>11. Non-solicitation.</b> During this Agreement and for twelve (12) months after it ends, neither party will solicit for employment any member of the other's staff who worked on this project, without the other's written consent.</p>
<p><b>12. Term and termination.</b> This Agreement runs from the Effective Date until the Deliverables are accepted and all fees are paid, unless ended earlier. Either party may end it by written notice if the other materially breaches it and does not remedy the breach within fourteen (14) days of notice, or becomes insolvent. The Client may end it for convenience on thirty (30) days' written notice. On termination the Client pays for work performed and costs committed up to the termination date, and Orion Soft delivers the work completed and paid for.</p>
${GOVERNING_LAW}
${BOILERPLATE}`,
  },

  licence_subscription: {
    name: "Software Licence & Subscription Agreement", kind: "agreement", docLabel: "Licence Agreement", payable: true, requiresScope: false,
    bodyMarkup:
`<p><b>1. Licensed software.</b> Orion Soft grants the Client a non-exclusive, non-transferable licence to use <b>{{licensedProducts}}</b> ("the Software") under a <b>{{licenceType|annual subscription}}</b> licence for up to <b>{{authorisedUsers|the agreed number of}}</b> authorised users, solely for the Client's internal operations, for the licence period stated in this Agreement.</p>
<p><b>2. Deployment and set-up.</b> The Software is provided as <b>{{deploymentType|a cloud service}}</b>. Orion Soft will carry out the set-up, configuration, initial data import and training described in the Scope of Work.</p>
<p><b>3. End User Licence Agreement.</b> Use of the Software is also governed by the Orion Soft End User Licence Agreement (OSL-EULA-001). If it conflicts with this Agreement, this Agreement prevails.</p>
<p><b>4. Restrictions.</b> The Client must not sell, sublicense, rent or distribute the Software; reverse engineer or decompile it except where the law allows; remove proprietary notices; share credentials outside its authorised users; circumvent licensing or security controls; or use it unlawfully.</p>
<p><b>5. Subscription fees and renewal.</b> The Client pays the set-up and subscription fees in the Fees and Payment section. Unless stated otherwise, fees exclude VAT (currently 7.5%). Subscriptions renew for the same period unless either party gives thirty (30) days' written notice before renewal. Orion Soft may review subscription fees at renewal with at least thirty (30) days' notice. If fees remain unpaid fourteen (14) days after the due date, Orion Soft may suspend access after written notice until payment is made.</p>
<p><b>6. Support and updates.</b> Orion Soft provides support under the <b>{{supportPlan|Standard}}</b> plan, including bug fixes, security patches and updates released for the licensed edition. Custom development and on-site visits beyond the plan are charged separately.</p>
<p><b>7. Availability.</b> For cloud deployments, Orion Soft will use commercially reasonable efforts to keep the Software available and to schedule maintenance outside business hours with advance notice where practicable.</p>
<p><b>8. Customer data.</b> The Client owns its data. Orion Soft accesses it only to provide and support the Software, keeps it secure and confidential, and complies with the Nigeria Data Protection Act 2023. On termination, Orion Soft will make the Client's data available for export for thirty (30) days, after which it may be deleted.</p>
<p><b>9. Intellectual property.</b> The Software, including all updates, documentation and related materials, remains the property of Orion Soft or its licensors. No ownership passes under this Agreement.</p>
<p><b>10. Confidentiality.</b> Each party keeps the other's confidential information confidential and uses it only for this Agreement. This continues for three (3) years after this Agreement ends.</p>
<p><b>11. Warranty.</b> Orion Soft warrants that the Software will perform materially as described in its documentation and will correct reproducible defects reported during the licence period. Otherwise the Software is provided as is, and Orion Soft does not guarantee uninterrupted or error-free operation.</p>
<p><b>12. Limitation of liability.</b> Neither party is liable for indirect or consequential loss, or loss of profit, revenue or data. Each party's total liability is limited to the fees paid in the twelve (12) months before the claim. These limits do not apply to fraud, wilful misconduct, breach of confidentiality or liability that cannot be limited by law.</p>
<p><b>13. Term and termination.</b> This Agreement starts on the Effective Date and continues for the licence period and any renewal. Either party may terminate on written notice if the other materially breaches it and does not remedy the breach within fourteen (14) days. On termination the licence ends, and fees for the current period remain payable.</p>
${GOVERNING_LAW}
${BOILERPLATE}`,
  },

  service_contract: {
    name: "Professional Services Agreement", kind: "agreement", docLabel: "Client Agreement", payable: true, requiresScope: true,
    bodyMarkup:
`<p><b>1. Services.</b> Orion Soft will provide the services described in the Scope of Work and Deliverables above (the "Services") with reasonable skill, care and diligence, using suitably qualified personnel.</p>
<p><b>2. Client responsibilities.</b> {{clientName}} will provide timely access, information, facilities, decisions and approvals reasonably needed. Delays caused by the Client move timelines by a corresponding period.</p>
<p><b>3. Changes.</b> Additional or different services require written agreement on scope, fees and timelines before the work starts.</p>
<p><b>4. Fees, expenses and payment.</b> The Client will pay the fees in the Fees and Payment section by the due dates shown. Pre-approved travel and out-of-pocket expenses are reimbursed at cost. Unless stated otherwise, fees exclude VAT (currently 7.5%). Unpaid amounts more than fourteen (14) days overdue entitle Orion Soft, after written notice, to pause the Services until payment.</p>
<p><b>5. Intellectual property.</b> Reports and materials produced specifically for the Client belong to the Client on full payment. Orion Soft keeps its pre-existing materials, methods, tools and know-how, and grants the Client a licence to use any included in the deliverables for its internal purposes.</p>
<p><b>6. Confidentiality and data protection.</b> Each party keeps the other's confidential information confidential for three (3) years after this Agreement ends. Personal data is handled in line with the Nigeria Data Protection Act 2023.</p>
<p><b>7. Warranty and liability.</b> Orion Soft will re-perform any Service that does not meet this Agreement if notified within thirty (30) days of performance. Neither party is liable for indirect or consequential loss; each party's total liability is limited to the fees paid or payable under this Agreement, except for fraud, wilful misconduct, breach of confidentiality or liability that cannot be limited by law.</p>
<p><b>8. Term and termination.</b> This Agreement runs from the Effective Date until the Services are complete, unless ended earlier. Either party may terminate for unremedied material breach on fourteen (14) days' notice, or for convenience on thirty (30) days' notice. The Client pays for Services performed up to termination.</p>
${GOVERNING_LAW}
${BOILERPLATE}`,
  },

  nda: {
    name: "Mutual Non-Disclosure Agreement", kind: "agreement", docLabel: "Non-Disclosure Agreement", payable: false, requiresScope: false,
    bodyMarkup:
`<p><b>1. Purpose.</b> The parties wish to share confidential information for the purpose of <b>{{purpose|evaluating and pursuing a possible business relationship}}</b> (the "Purpose").</p>
<p><b>2. Confidential information.</b> "Confidential Information" means any information disclosed by one party (the "Discloser") to the other (the "Recipient"), in any form, that is marked confidential or would reasonably be understood to be confidential, including business plans, pricing, customer and supplier information, software, source code, designs, data and know-how.</p>
<p><b>3. Obligations.</b> The Recipient will: keep the Confidential Information confidential; use it only for the Purpose; disclose it only to its employees, officers and advisers who need to know it for the Purpose and are bound by equivalent obligations; and protect it with at least the care it uses for its own confidential information, and no less than reasonable care.</p>
<p><b>4. Exceptions.</b> These obligations do not apply to information that is or becomes public through no fault of the Recipient; was lawfully known to the Recipient before disclosure; is lawfully received from a third party without restriction; or is independently developed without use of the Confidential Information. The Recipient may disclose information required by law or a court or regulator, after giving the Discloser prompt notice where lawful.</p>
<p><b>5. Personal data.</b> Any personal data shared is handled in line with the Nigeria Data Protection Act 2023 and used only for the Purpose.</p>
<p><b>6. Return or destruction.</b> On request, the Recipient will promptly return or destroy the Confidential Information and confirm this in writing, except copies it must keep by law, which remain confidential.</p>
<p><b>7. No licence or obligation.</b> No licence or ownership is granted by disclosure, and neither party is obliged to enter into any further agreement. Information is provided as is.</p>
<p><b>8. Duration.</b> This Agreement starts on the Effective Date. The obligations in it continue for <b>{{confidentialityYears|three (3)}}</b> years after the last disclosure, and indefinitely for trade secrets and source code.</p>
<p><b>9. Remedies.</b> Unauthorised disclosure may cause harm that damages alone cannot remedy, so the Discloser may seek injunctive relief in addition to any other remedy.</p>
${GOVERNING_LAW}
${BOILERPLATE}`,
  },

  eula: {
    name: "End User Licence Agreement (EULA)", kind: "agreement", docLabel: "End User Licence Agreement · OSL-EULA-001", payable: false, requiresScope: false,
    bodyMarkup:
`<p><b>1. Introduction.</b> This End User Licence Agreement is a legally binding agreement between {{companyName}} ("Orion Soft", "we") and {{clientName}} ("the Customer", "you") for the installation, access and use of Orion Soft software. By installing, accessing, activating or using the software, you agree to this Agreement. If you do not agree, do not install or use the software.</p>
<p><b>2. Scope.</b> This Agreement applies to all Orion Soft software products, applications, modules, portals, web, desktop and mobile applications, cloud services, APIs, plugins and related technologies, including:</p>
<ul><li>Healthcare management and school management solutions</li><li>Compliance and inventory management solutions</li><li>Director portals and enterprise management systems</li><li>Artificial intelligence solutions and business automation platforms</li><li>Custom software solutions and future Orion Soft products and modules</li></ul>
<p><b>3. Grant of licence.</b> Subject to this Agreement and payment of the applicable licence fees, Orion Soft grants the Customer a limited, non-exclusive, non-transferable and revocable licence to use the software solely for its internal business operations. No ownership rights are transferred.</p>
<p><b>4. Permitted use.</b> The Customer may install the software on authorised systems, allow authorised employees or users to access it, use it for lawful business purposes, and receive updates and support where included in the purchased licence.</p>
<p><b>5. Licence restrictions.</b> The Customer shall not:</p>
<ul><li>sell, sublicense, rent, lease or distribute the software without written permission;</li><li>reverse engineer, decompile or disassemble the software, except where permitted by law;</li><li>remove copyright notices, trademarks or licence information;</li><li>share licence credentials with unauthorised persons;</li><li>circumvent security or licensing mechanisms;</li><li>use the software for illegal or fraudulent activities; or</li><li>modify the software without Orion Soft's written approval.</li></ul>
<p><b>6. Ownership.</b> All intellectual property rights in the software, source code, databases, documentation, trademarks, designs, logos, interfaces and related materials remain the exclusive property of Orion Soft or its licensors.</p>
<p><b>7. User accounts and security.</b> The Customer is responsible for keeping user credentials confidential, managing user permissions, promptly reporting suspected unauthorised access, and ensuring its authorised users comply with this Agreement.</p>
<p><b>8. Activation and licensing.</b> Some products require activation, licence keys, online licence validation, periodic verification, subscription verification or device registration. Failure to maintain a valid licence may result in restricted functionality or suspension of access under the applicable licence terms.</p>
<p><b>9. Updates.</b> Orion Soft may provide updates, enhancements, bug fixes, security patches or new features. Some updates may be mandatory to maintain security, compatibility or regulatory compliance.</p>
<p><b>10. Technical support.</b> Support is provided under the purchased support plan or applicable Service Level Agreement and may include installation assistance, troubleshooting, updates, bug fixes and user guidance. It does not include custom development unless separately agreed.</p>
<p><b>11. Customer data.</b> The Customer retains ownership of its business data. Orion Soft accesses customer data only where necessary to provide support, perform maintenance, resolve technical issues, fulfil contractual obligations or comply with law, and applies reasonable safeguards when it does.</p>
<p><b>12. Privacy.</b> Personal data is handled under Orion Soft's Privacy Policy and the Nigeria Data Protection Act 2023. The Customer remains responsible for its own compliance when using the software.</p>
<p><b>13. Acceptable use.</b> Users shall not use the software to violate laws or regulations, infringe intellectual property rights, transmit malicious software, attempt unauthorised access to systems, disrupt services for other users, or store or process unlawful content.</p>
<p><b>14. Third-party components.</b> The software may include third-party libraries or services licensed under their own terms, which the Customer agrees to comply with where relevant.</p>
<p><b>15. Warranty disclaimer.</b> Except as expressly stated in a written agreement, the software is provided "as is" and "as available". Orion Soft does not guarantee uninterrupted or error-free operation, but will use commercially reasonable efforts to maintain the quality and reliability of its software and services.</p>
<p><b>16. Limitation of liability.</b> To the maximum extent permitted by law, Orion Soft is not liable for indirect, incidental, consequential, special or punitive damages, including loss of profits, business interruption or loss of data arising from use of, or inability to use, the software. Nothing limits liability where limitation is prohibited by law.</p>
<p><b>17. Suspension or termination.</b> Orion Soft may suspend or terminate a licence where licence fees remain unpaid, this Agreement is materially breached, the software is used unlawfully, security is intentionally compromised, or fraud is detected. Where appropriate, Orion Soft will give notice and an opportunity to remedy the breach first.</p>
<p><b>18. Export compliance.</b> The Customer will comply with all applicable export control, sanctions and trade laws relating to the software.</p>
${GOVERNING_LAW}
<p><b>Changes to this Agreement.</b> Orion Soft may update this EULA from time to time. Updated versions apply prospectively and will be communicated through appropriate channels. Continued use after an update takes effect constitutes acceptance, unless prohibited by law.</p>
<p><b>Contact.</b> {{companyName}}, {{companyAddress}} · {{companyEmail}} · {{companyPhone}} · {{companyWebsite}}</p>`,
  },

  licence_certificate: {
    name: "Software Licence Certificate", kind: "certificate", docLabel: "Software Licence Certificate", payable: false, requiresScope: false,
    bodyMarkup:
`<p>This certifies that <b>{{clientOrganisation}}</b> is licensed by {{companyName}} to use the software below, on the terms of the applicable Software Licence Agreement, the End User Licence Agreement (OSL-EULA-001), the Privacy Policy and any Service Level Agreement between the parties.</p>
<ul>
<li><b>Licensed product(s):</b> {{licensedProducts}}</li>
<li><b>Product version:</b> {{productVersion|current release}}</li>
<li><b>Licence type:</b> {{licenceType|Annual subscription}}</li>
<li><b>Deployment:</b> {{deploymentType|Cloud}}</li>
<li><b>Authorised users:</b> {{authorisedUsers|As agreed}} · <b>Devices:</b> {{authorisedDevices|As agreed}} · <b>Sites / branches:</b> {{approvedSites|1}}</li>
<li><b>Activation date:</b> {{effectiveDate}} · <b>Expiry date:</b> {{endDate|Perpetual, subject to the applicable agreements}}</li>
<li><b>Licence key / activation code:</b> {{licenceKey|Issued separately}}</li>
<li><b>Support plan:</b> {{supportPlan|Standard}}</li>
<li><b>Included services:</b> {{includedServices|Installation, configuration, initial training, updates and technical support}}</li>
</ul>
<p>This certificate does not transfer ownership of the software or any intellectual property. The licence remains subject to compliance with all contractual obligations, including payment of applicable licence and support fees.</p>
<p>To verify this certificate, contact {{companyName}} at {{companyEmail}} or {{companyPhone}}, quoting certificate number {{contractNumber}}.</p>`,
  },

  proposal: {
    name: "Proposal & Quotation", kind: "agreement", docLabel: "Proposal & Quotation", payable: true, requiresScope: true,
    bodyMarkup:
`<p><b>1. Introduction.</b> Dear {{clientName}}, {{companyName}} is pleased to present this proposal for <b>{{productName}}</b>. The recommended solution, what it covers and the investment are set out above.</p>
<p><b>2. What's included.</b> Set-up and configuration, data import from your existing records where provided in an agreed format, training for administrators and key users, go-live support, and ongoing updates and support under the chosen plan.</p>
<p><b>3. Validity.</b> This quotation is valid for <b>{{validityDays|14}}</b> days from the Effective Date. Prices exclude VAT (currently 7.5%) unless stated.</p>
<p><b>4. Payment.</b> Payment follows the schedule in the Fees and Payment section. Work starts once this proposal is accepted and the first payment is received.</p>
<p><b>5. Acceptance.</b> Signing this proposal confirms acceptance of the solution, fees and schedule above. Use of the software is subject to the Orion Soft End User Licence Agreement (OSL-EULA-001) and, where issued, a Software Licence Agreement.</p>
<p><b>6. Next steps.</b> After acceptance, we will confirm a project start date, a named contact on each side and a set-up timeline.</p>`,
  },

  employment_contract: {
    name: "Employment Contract", kind: "agreement", docLabel: "Contract of Employment", payable: false, requiresScope: false,
    bodyMarkup:
`<p><b>1. Appointment.</b> {{companyName}} ("the Company") employs {{clientName}} ("the Employee") as <b>{{role}}</b> in the <b>{{department}}</b> department, starting on <b>{{startDate}}</b>, reporting to {{reportsTo|the Head of Department}}.</p>
<p><b>2. Probation.</b> The first <b>{{probationMonths|three (3)}}</b> months are a probationary period, during which either party may end employment on one (1) week's written notice. Confirmation of appointment will be in writing.</p>
<p><b>3. Place and hours of work.</b> The Employee's normal place of work is <b>{{workLocation|the Company's office, remotely or on field assignments as required}}</b>. Normal working hours are Monday to Friday, 9:00 a.m. to 5:00 p.m., with reasonable additional hours as the role requires. Attendance is recorded through the Staff Office.</p>
<p><b>4. Remuneration.</b> The Employee's gross salary is <b>{{salaryCurrency|NGN}} {{salaryAmount}}</b> per {{salaryPeriod|month}}, paid monthly in arrears into the Employee's nominated bank account, subject to statutory deductions including Pay-As-You-Earn tax, pension contributions under the Pension Reform Act 2014, and other lawful deductions.</p>
<p><b>5. Leave.</b> The Employee is entitled to <b>{{annualLeaveDays|15}}</b> working days of paid annual leave per year after twelve (12) months of continuous service (pro-rated in the first year), plus public holidays, sick leave and statutory maternity or paternity leave, all requested through the Staff Office.</p>
<p><b>6. Duties and conduct.</b> The Employee will perform the duties of the role diligently, follow lawful instructions and Company policies in the Staff Handbook, submit weekly reports, and not engage in any other business that conflicts with the Company's interests without written consent.</p>
<p><b>7. Confidentiality.</b> The Employee will keep confidential all Company and client information during and after employment, and use it only for the Company's business.</p>
<p><b>8. Intellectual property.</b> All work, software, designs, documents and inventions created by the Employee in the course of employment belong to the Company.</p>
<p><b>9. Data protection.</b> The Company processes the Employee's personal data for employment purposes in line with the Nigeria Data Protection Act 2023.</p>
<p><b>10. Termination.</b> After confirmation, either party may end employment on <b>{{noticePeriod|one (1) month}}</b>'s written notice or payment in lieu of notice. The Company may terminate summarily for gross misconduct. On leaving, the Employee returns all Company property, including the staff ID card, equipment and data.</p>
<p><b>11. Governing law.</b> This contract is governed by the laws of the Federal Republic of Nigeria, including the Labour Act where applicable.</p>
<p><b>12. Entire agreement.</b> This contract, with the Staff Handbook as amended from time to time, is the entire agreement on the Employee's employment. It may be signed electronically, which is valid under the Evidence Act 2011.</p>`,
  },

  offer_letter: {
    name: "Offer Letter", kind: "letter", docLabel: "Offer of Employment", payable: false, requiresScope: false,
    bodyMarkup:
`<p>Dear {{recipientName}},</p>
<p>We are pleased to offer you the position of <b>{{role}}</b> at {{companyName}}, in the {{department}} team, starting on <b>{{startDate}}</b>.</p>
<p>Your gross salary will be <b>{{salaryCurrency|NGN}} {{salaryAmount}}</b> per {{salaryPeriod|month}}, subject to statutory deductions. The first {{probationMonths|three (3)}} months are a probationary period. Full terms will be set out in your contract of employment.</p>
<p>This offer is subject to satisfactory references and verification of your qualifications. Please confirm your acceptance by signing below within seven (7) days.</p>
<p>We look forward to welcoming you to the team.</p>
<p>Yours sincerely,</p>`,
  },

  onboarding_letter: {
    name: "Onboarding Letter", kind: "letter", docLabel: "Welcome Letter", payable: false, requiresScope: false,
    bodyMarkup:
`<p>Dear {{recipientName}},</p>
<p>Welcome to {{companyName}}! We're excited to have you join us as <b>{{role}}</b>.</p>
<p>Your first day is <b>{{startDate}}</b>. To help you settle in:</p>
<ul>
<li>Your Staff Office login details are sent separately by email.</li>
<li>Complete your profile, set up your phone and add your passport photo for your staff ID card.</li>
<li>Read the Staff Playbook in Handbook &amp; Links.</li>
<li>Submit your first weekly report at the end of your first week.</li>
</ul>
<p>If you have any questions before your start date, please reach out to your manager or HR.</p>
<p>Welcome aboard!</p>`,
  },

  // After a deal is agreed: the items the client is paying for, each with its
  // amount and due date. No signature: the client gets one payment link that
  // always shows what's due next, until everything is paid.
  payment_plan: {
    name: "Payment Plan (items & due dates)", kind: "plan", docLabel: "Payment Plan", payable: true, requiresScope: false,
    bodyMarkup:
`<p>Dear {{contactName}},</p>
<p>Thank you for choosing {{companyName}}. As agreed, this payment plan lists each item you are paying for, its amount and its due date. The same secure payment link works for every payment: open it at any time to see what is due next, pay online or by bank transfer, and download your receipts.</p>
<p>Unless stated otherwise, amounts exclude VAT (currently 7.5%). Please pay each item by its due date; we will send a reminder a few days before.</p>`,
  },

  payslip_receipt: {
    name: "Payslip Receipt", kind: "letter", docLabel: "Payment Confirmation", payable: false, requiresScope: false,
    bodyMarkup:
`<p>This confirms that <b>{{recipientName}}</b> was paid <b>{{currency}} {{amount}}</b> for the period {{period}}, in accordance with their employment terms at {{companyName}}.</p>`,
  },
};

export const CONTRACT_TEMPLATE_TYPES = Object.keys(CONTRACT_TEMPLATES);

// Bodies of the first templates shipped. A stored template still identical to
// one of these was never edited, so it is upgraded to the new text; edited
// templates are left alone (the admin can "reset to default").
export const LEGACY_DEFAULT_BODIES = new Set(Object.values(DEFAULT_TEMPLATES).map(t => t.bodyMarkup.trim()));

// {{key}} / {{key|default}} → value. Unknown keys without a default are kept
// as {{key}} so creation can refuse to produce a half-filled document.
export function fillTemplate(bodyMarkup, data = {}) {
  return String(bodyMarkup).replace(/\{\{\s*(\w+)\s*(?:\|([^}]*))?\}\}/g, (m, key, def) => {
    const v = data[key];
    if (v != null && String(v).trim() !== "") return String(v);
    if (def !== undefined) return def.trim();
    return `{{${key}}}`;
  });
}

// Placeholders the admin must fill (not provided automatically, no default).
export function requiredPlaceholders(bodyMarkup, autoKeys = []) {
  const auto = new Set(autoKeys);
  const out = [];
  for (const m of String(bodyMarkup).matchAll(/\{\{\s*(\w+)\s*(\|[^}]*)?\}\}/g)) {
    if (!auto.has(m[1]) && !out.some(x => x.key === m[1])) out.push({ key: m[1], defaultValue: m[2] ? m[2].slice(1).trim() : null });
  }
  return out;
}
