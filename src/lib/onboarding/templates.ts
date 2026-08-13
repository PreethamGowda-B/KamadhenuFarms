export interface DocumentSnapshotData {
  applicationId: string;
  applicationNo: string;
  fullName: string;
  mobileNumber: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  joiningDate: string;
  workingTerritory: string;
  commissionRate: string;
  commissionMin: number;
  commissionMax: number;
  payoutFrequency: string;
  reportingManager: string;
  engagementType: string;
  additionalTerms?: string;
  validFrom: string;
  validUntil: string;
  documentNo: string;
  issueDate: string;
  version: number;
  isAuthActive?: boolean;
}

export type DocTypeKey =
  | 'OFFER_LETTER'
  | 'AUTHORIZATION_LETTER'
  | 'COMMISSION_POLICY'
  | 'PRICE_CATALOGUE'
  | 'SALES_GUIDELINES'
  | 'CODE_OF_CONDUCT'
  | 'COMPLETE_ONBOARDING_PACK';

export function getVerificationUrl(applicationNo: string): string {
  const salesId = applicationNo.replace(/[^a-zA-Z0-9-]/g, '');
  return `/verify/${salesId}`;
}

export function calculateValidUntil(validFromStr: string): string {
  const d = new Date(validFromStr);
  if (isNaN(d.getTime())) {
    const today = new Date();
    today.setFullYear(today.getFullYear() + 1);
    today.setDate(today.getDate() - 1);
    return today.toISOString().split('T')[0];
  }
  d.setFullYear(d.getFullYear() + 1);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export function generateDocumentHtml(docType: DocTypeKey, data: DocumentSnapshotData): string {
  const verificationPath = getVerificationUrl(data.applicationNo);
  const qrcodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
    `https://kamadhenuhoneyfarms.in${verificationPath}`
  )}`;

  const companyHeaderHtml = `
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px double #d4af37; padding-bottom: 16px; margin-bottom: 24px;">
      <div>
        <h1 style="margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 26px; color: #1a202c; letter-spacing: 0.5px;">
          KAMADHENU HONEY FARMS
        </h1>
        <p style="margin: 3px 0 0 0; font-size: 11px; color: #b8860b; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
          Pure Raw Honey & Farm Fresh Apiary Products
        </p>
        <p style="margin: 2px 0 0 0; font-size: 10px; color: #718096;">
          Farm Address: Cholanayakanahalli, Magadi Main Road, Thavarekere, Bangalore Urban, Bangalore South - 562130
        </p>
        <p style="margin: 2px 0 0 0; font-size: 10px; color: #718096;">
          Email: kamadhenuhoneyfarms@gmail.com | Phone: +91 9980114675 / +91 9535134351 | Web: www.kamadhenuhoneyfarms.in
        </p>
      </div>
      <div style="text-align: right; min-width: 110px;">
        <div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #d4af37, #b8860b); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 22px; box-shadow: 0 4px 10px rgba(184,134,11,0.3);">
          KHF
        </div>
      </div>
    </div>
  `;

  const metaHeaderHtml = (title: string, docNo: string) => `
    <div style="background-color: #fcfbf7; border: 1px solid #e2e8f0; border-left: 4px solid #d4af37; padding: 12px 16px; margin-bottom: 20px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h2 style="margin: 0; font-size: 18px; font-family: serif; color: #1a202c; text-transform: uppercase;">${title}</h2>
        <p style="margin: 3px 0 0 0; font-size: 11px; color: #4a5568;">
          Candidate: <strong>${data.fullName}</strong> (${data.applicationNo})
        </p>
      </div>
      <div style="text-align: right; font-size: 11px; color: #4a5568;">
        <div><strong>Doc Ref:</strong> ${docNo}</div>
        <div><strong>Issue Date:</strong> ${data.issueDate}</div>
        <div><strong>Version:</strong> v${data.version}.0</div>
      </div>
    </div>
  `;

  const candidateInfoBox = `
    <div style="background: #faf8f2; border: 1px solid #edd99b; border-radius: 6px; padding: 14px; margin-bottom: 20px; font-size: 11px; color: #2d3748;">
      <h3 style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; color: #b8860b; text-transform: uppercase; border-bottom: 1px solid #ebd48e; padding-bottom: 4px;">Sales Executive Profile</h3>
      <table style="width: 100%; border-collapse: collapse; line-height: 1.6;">
        <tr>
          <td style="width: 50%; vertical-align: top;">
            <strong>Full Name:</strong> ${data.fullName}<br/>
            <strong>Sales ID / Application ID:</strong> ${data.applicationNo}<br/>
            <strong>Designated Role:</strong> ${data.engagementType}
          </td>
          <td style="width: 50%; vertical-align: top;">
            <strong>Working Territory:</strong> ${data.workingTerritory}<br/>
            <strong>Joining Date:</strong> ${data.joiningDate}<br/>
            <strong>Reporting Manager:</strong> ${data.reportingManager}
          </td>
        </tr>
      </table>
    </div>
  `;

  const signatureSectionHtml = `
    <div style="margin-top: 40px; pt-20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; page-break-inside: avoid;">
      <div style="width: 45%; text-align: center; font-size: 11px; color: #2d3748;">
        <p style="margin-bottom: 45px; color: #718096; font-style: italic;">Candidate Signature & Acceptance</p>
        <div style="border-top: 1px dashed #718096; padding-top: 6px;">
          <strong>${data.fullName}</strong><br/>
          <span>${data.engagementType}</span><br/>
          <span>Date: ________________________</span>
        </div>
      </div>
      <div style="width: 45%; text-align: center; font-size: 11px; color: #2d3748;">
        <p style="margin-bottom: 45px; color: #718096; font-style: italic;">For Kamadhenu Honey Farms</p>
        <div style="border-top: 1px dashed #718096; padding-top: 6px;">
          <strong>Authorized Representative</strong><br/>
          <span>Director / HR Head</span><br/>
          <span>Date: ${data.issueDate}</span>
        </div>
      </div>
    </div>
  `;

  // Render sub-templates
  switch (docType) {
    case 'OFFER_LETTER': {
      return `
        <div style="font-family: sans-serif; max-width: 800px; margin: 0 auto; background: #fff; padding: 32px; color: #2d3748; line-height: 1.6; font-size: 12px;">
          ${companyHeaderHtml}
          ${metaHeaderHtml('Offer & Sales Engagement Letter', data.documentNo)}
          ${candidateInfoBox}

          <p>Dear <strong>${data.fullName}</strong>,</p>
          <p>
            We are pleased to offer you engagement with <strong>Kamadhenu Honey Farms</strong> as a 
            <strong>${data.engagementType}</strong> for our retail and institutional sales division.
          </p>

          <h4 style="color: #b8860b; margin-top: 16px; margin-bottom: 8px; font-size: 13px; text-transform: uppercase;">1. Role & Territory</h4>
          <p>
            You will be responsible for sales lead generation, store outreach, order collection, and retail relationship management across your assigned working territory:
            <strong>${data.workingTerritory}</strong>. You will report directly to <strong>${data.reportingManager}</strong>.
          </p>

          <h4 style="color: #b8860b; margin-top: 16px; margin-bottom: 8px; font-size: 13px; text-transform: uppercase;">2. Date of Joining & Probation</h4>
          <p>
            Your effective joining date is <strong>${data.joiningDate}</strong>. You will be on a probation period of 60 days during which your sales consistency and retailer onboarding performance will be reviewed.
          </p>

          <h4 style="color: #b8860b; margin-top: 16px; margin-bottom: 8px; font-size: 13px; text-transform: uppercase;">3. Remuneration & Commission Structure</h4>
          <p>
            Your performance compensation is governed by the official Kamadhenu Honey Farms Commission Policy, with a tier rate ranging from 
            <strong>${data.commissionRate}</strong> paid on a <strong>${data.payoutFrequency}</strong> cycle for verified and fully paid customer orders.
          </p>

          <h4 style="color: #b8860b; margin-top: 16px; margin-bottom: 8px; font-size: 13px; text-transform: uppercase;">4. Scope of Duties & Strict Payment Policy</h4>
          <ul>
            <li>Promote Kamadhenu Pure Raw Honey products to retail shops, grocery stores, supermarkets, distributors, and potential customers.</li>
            <li>Submit shop visit logs and order requirements to company management daily by 7:00 PM.</li>
            <li><strong>Strict Company Payment Policy:</strong> All customer payments must be remitted directly to official Kamadhenu Honey Farms company bank accounts or official company UPI/QR codes. Sales Executives are strictly prohibited from receiving or collecting money into personal accounts, personal UPI IDs, or personal wallets.</li>
          </ul>

          ${data.additionalTerms ? `
            <h4 style="color: #b8860b; margin-top: 16px; margin-bottom: 8px; font-size: 13px; text-transform: uppercase;">5. Additional Engagement Terms</h4>
            <p style="background: #f7fafc; padding: 10px; border-left: 3px solid #cbd5e0;">${data.additionalTerms}</p>
          ` : ''}

          <p style="margin-top: 20px;">
            Please sign and return the copy of this letter along with the signed Commission Policy and Code of Conduct documents to confirm your acceptance.
          </p>

          ${signatureSectionHtml}
        </div>
      `;
    }

    case 'AUTHORIZATION_LETTER': {
      const isRevoked = data.isAuthActive === false;
      return `
        <div style="font-family: sans-serif; max-width: 800px; margin: 0 auto; background: #fff; padding: 32px; color: #2d3748; line-height: 1.6; font-size: 12px;">
          ${companyHeaderHtml}
          ${metaHeaderHtml('Official Sales Authorization Letter', data.documentNo)}

          <div style="text-align: center; margin: 16px 0 24px 0; padding: 12px; background: ${isRevoked ? '#fff5f5' : '#f0fff4'}; border: 2px solid ${isRevoked ? '#feb2b2' : '#9ae6b4'}; border-radius: 8px;">
            <span style="font-size: 14px; font-weight: bold; color: ${isRevoked ? '#c53030' : '#276749'}; text-transform: uppercase;">
              ${isRevoked ? '❌ AUTHORIZATION REVOKED / EXPIRED' : '✓ OFFICIAL AUTHORIZED FIELD REPRESENTATIVE'}
            </span>
          </div>

          <p style="text-align: justify;">
            <strong>TO WHOMSOEVER IT MAY CONCERN</strong>
          </p>

          <p style="text-align: justify;">
            This is to certify that <strong>${data.fullName}</strong> (Holding Sales ID: <strong>${data.applicationNo}</strong>) is an officially authorized <strong>${data.engagementType}</strong> representing <strong>Kamadhenu Honey Farms</strong>.
          </p>

          <div style="background: #fffaf0; border: 1px solid #fbd38d; padding: 14px; border-radius: 6px; margin: 16px 0;">
            <table style="width: 100%; font-size: 11px;">
              <tr>
                <td><strong>Authorized Representative:</strong> ${data.fullName}</td>
                <td><strong>Sales ID:</strong> ${data.applicationNo}</td>
              </tr>
              <tr>
                <td><strong>Designated Role:</strong> ${data.engagementType}</td>
                <td><strong>Working Territory:</strong> ${data.workingTerritory}</td>
              </tr>
              <tr>
                <td><strong>Authorization Start Date:</strong> ${data.validFrom}</td>
                <td><strong>Authorization Expiry Date:</strong> ${data.validUntil}</td>
              </tr>
            </table>
          </div>

          <h4 style="color: #b8860b; margin-top: 16px; margin-bottom: 6px; font-size: 12px; text-transform: uppercase;">Authorized Scope of Duties</h4>
          <ul style="margin-top: 4px; padding-left: 20px;">
            <li>Visit retail outlets, supermarkets, grocery stores, distributors, and potential commercial clients.</li>
            <li>Present official product information, samples, and authorized price catalogues.</li>
            <li>Collect retailer product requirements and submit order details to Kamadhenu Honey Farms management for confirmation and fulfillment.</li>
          </ul>

          <h4 style="color: #c53030; margin-top: 14px; margin-bottom: 6px; font-size: 12px; text-transform: uppercase;">Explicit Operational Limitations</h4>
          <ul style="margin-top: 4px; padding-left: 20px; color: #742a2a;">
            <li>NOT authorized to collect payments into personal bank accounts, personal UPI IDs, or wallets.</li>
            <li>NOT authorized to collect cash payments on behalf of the company.</li>
            <li>NOT authorized to alter official company pricing, grant unauthorized discounts, or promise unapproved credit.</li>
            <li>NOT authorized to execute contracts or represent self as owner, partner, or director.</li>
          </ul>

          <div style="display: flex; gap: 20px; align-items: center; background: #f7fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 20px;">
            <div>
              <img src="${qrcodeApiUrl}" alt="Verification QR Code" style="width: 110px; height: 110px; border: 1px solid #cbd5e0; border-radius: 4px;" />
            </div>
            <div style="font-size: 11px;">
              <h4 style="margin: 0 0 6px 0; font-size: 12px; color: #b8860b;">Digital QR Verification System</h4>
              <p style="margin: 0 0 6px 0;">Retailers and distributors can instantly verify the real-time active status of this representative by scanning the QR code or visiting:</p>
              <code style="background: #edf2f7; padding: 4px 8px; border-radius: 4px; font-weight: bold; color: #2b6cb0;">
                https://kamadhenuhoneyfarms.in${verificationPath}
              </code>
            </div>
          </div>

          ${signatureSectionHtml}
        </div>
      `;
    }

    case 'COMMISSION_POLICY': {
      return `
        <div style="font-family: sans-serif; max-width: 800px; margin: 0 auto; background: #fff; padding: 32px; color: #2d3748; line-height: 1.6; font-size: 12px;">
          ${companyHeaderHtml}
          ${metaHeaderHtml('Sales Commission Policy & Structure', data.documentNo)}
          ${candidateInfoBox}

          <p>
            This document outlines the official commission policy governing sales executed by 
            <strong>${data.fullName}</strong> as a <strong>${data.engagementType}</strong> on behalf of <strong>Kamadhenu Honey Farms</strong>.
          </p>

          <h4 style="color: #b8860b; margin-top: 16px; margin-bottom: 8px; font-size: 13px; text-transform: uppercase;">1. Tiered Volume Commission Structure</h4>
          <p>Commission is calculated on total verified monthly sales volume achieved in kilograms:</p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px;">
            <thead>
              <tr style="background: #d4af37; color: #fff; text-align: left;">
                <th style="padding: 8px; border: 1px solid #b8860b;">Monthly Volume Tier</th>
                <th style="padding: 8px; border: 1px solid #b8860b;">Commission Rate (Per KG)</th>
                <th style="padding: 8px; border: 1px solid #b8860b;">Eligibility Condition</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">Up to 250 KG</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; color: #2b6cb0;">₹${data.commissionMin || 100} / KG</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">Confirmed & Fully Paid Sales</td>
              </tr>
              <tr style="background: #f7fafc;">
                <td style="padding: 8px; border: 1px solid #e2e8f0;">251 KG – 500 KG</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; color: #2b6cb0;">₹125 / KG</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">Confirmed & Fully Paid Sales</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">Above 500 KG</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; color: #2b6cb0;">₹${data.commissionMax || 150} / KG</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">Confirmed & Fully Paid Sales</td>
              </tr>
            </tbody>
          </table>

          <h4 style="color: #b8860b; margin-top: 16px; margin-bottom: 8px; font-size: 13px; text-transform: uppercase;">2. Payout Processing & Qualification</h4>
          <p>
            Commission is calculated weekly on all company-verified payments received by Sunday midnight and dispatched on the 
            <strong>${data.payoutFrequency}</strong> cycle directly to the representative's designated bank account.
          </p>

          <h4 style="color: #b8860b; margin-top: 16px; margin-bottom: 8px; font-size: 13px; text-transform: uppercase;">3. Order Validity & Clawback Clause</h4>
          <ul>
            <li><strong>Confirmed Paid Orders Only:</strong> Commission applies strictly to orders where full payment has been confirmed in company bank accounts.</li>
            <li><strong>Exclusions:</strong> Cancelled, returned, unpaid, fraudulent, or defaulted orders do not earn commission.</li>
            <li><strong>Clawback Provision:</strong> If a previously paid order is later returned or defaulted, the paid commission will be adjusted in the subsequent payout cycle.</li>
          </ul>

          ${signatureSectionHtml}
        </div>
      `;
    }

    case 'PRICE_CATALOGUE': {
      return `
        <div style="font-family: sans-serif; max-width: 800px; margin: 0 auto; background: #fff; padding: 32px; color: #2d3748; line-height: 1.6; font-size: 12px;">
          ${companyHeaderHtml}
          ${metaHeaderHtml('Official Product & Price Catalogue', data.documentNo)}

          <p style="background: #fffaf0; border: 1px solid #fbd38d; padding: 10px; border-radius: 6px; font-size: 11px; color: #744210;">
            <strong>Official Product Guarantee:</strong> All Kamadhenu Honey Farms products consist of Pure Raw Honey directly harvested from verified apiaries. Free from added sugars, synthetic syrups, or unapproved additives.
          </p>

          <h4 style="color: #b8860b; margin-top: 16px; margin-bottom: 8px; font-size: 13px; text-transform: uppercase;">Official Retail & Wholesale Pricing Structure (2026)</h4>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px;">
            <thead>
              <tr style="background: #d4af37; color: #fff; text-align: left;">
                <th style="padding: 8px; border: 1px solid #b8860b;">Product Variant</th>
                <th style="padding: 8px; border: 1px solid #b8860b;">Packaging</th>
                <th style="padding: 8px; border: 1px solid #b8860b;">MRP (₹)</th>
                <th style="padding: 8px; border: 1px solid #b8860b;">Wholesale Price (₹)</th>
                <th style="padding: 8px; border: 1px solid #b8860b;">Min Order Qty</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; font-size: 12px;">Kamadhenu Pure Raw Multiflora Honey</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">1 KG Glass Jar</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #b8860b;">₹999</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #276749; font-size: 13px;">₹550 / KG</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">12 Jars (1 Box)</td>
              </tr>
              <tr style="background: #fcfbf7;">
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; font-size: 12px;">Kamadhenu Dry Fruits Honey</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">1 KG Glass Jar</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #b8860b;">₹1200</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #276749; font-size: 13px;">₹650 / KG</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">12 Jars (1 Box)</td>
              </tr>
            </tbody>
          </table>

          <p style="font-size: 11px; color: #4a5568;">
            * Sales Executives must strictly quote prices mentioned in this official price catalogue. Any custom discount requires prior written approval from <strong>${data.reportingManager}</strong>.
          </p>

          ${signatureSectionHtml}
        </div>
      `;
    }

    case 'SALES_GUIDELINES': {
      return `
        <div style="font-family: sans-serif; max-width: 800px; margin: 0 auto; background: #fff; padding: 32px; color: #2d3748; line-height: 1.6; font-size: 12px;">
          ${companyHeaderHtml}
          ${metaHeaderHtml('Sales Reporting & Field Guidelines', data.documentNo)}
          ${candidateInfoBox}

          <h4 style="color: #b8860b; margin-top: 16px; margin-bottom: 8px; font-size: 13px; text-transform: uppercase;">1. Daily Field Routine & Target Visits</h4>
          <p>
            Full-time Sales Executives are expected to target approximately <strong>15 to 20 shop visits</strong> per working day within 
            <strong>${data.workingTerritory}</strong>. Part-time or flexible Sales Executives will have visit expectations based on their agreed availability, territory, and target plan.
          </p>

          <h4 style="color: #b8860b; margin-top: 16px; margin-bottom: 8px; font-size: 13px; text-transform: uppercase;">2. End-of-Day Sales Report Submission</h4>
          <p>
            Sales Executives must submit an End-of-Day (EOD) sales report by <strong>7:00 PM</strong> containing:
          </p>
          <ul>
            <li>Retail shops visited and new store leads.</li>
            <li>Collected order requirements (KG weight and product variant breakdown).</li>
            <li>Customer order references submitted for company confirmation.</li>
          </ul>

          <h4 style="color: #b8860b; margin-top: 16px; margin-bottom: 8px; font-size: 13px; text-transform: uppercase;">3. Company Payment Collection Protocol</h4>
          <p>
            All customer order payments must be made directly by the customer to official Kamadhenu Honey Farms bank accounts or official company UPI/QR codes. Sales Executives must never accept payments into personal accounts, personal UPI IDs, or wallets.
          </p>

          ${signatureSectionHtml}
        </div>
      `;
    }

    case 'CODE_OF_CONDUCT': {
      return `
        <div style="font-family: sans-serif; max-width: 800px; margin: 0 auto; background: #fff; padding: 32px; color: #2d3748; line-height: 1.6; font-size: 12px;">
          ${companyHeaderHtml}
          ${metaHeaderHtml('Sales Executive Code of Conduct', data.documentNo)}
          ${candidateInfoBox}

          <p style="background: #fff5f5; border-left: 4px solid #e53e3e; padding: 12px; font-weight: bold; color: #9b2c2c;">
            Mandatory Compliance Document: Violation of these requirements may result in immediate suspension or revocation of sales authorization and termination of the engagement, subject to applicable company policy and law.
          </p>

          <ol style="line-height: 1.8;">
            <li><strong>Zero Personal Financial Collections:</strong> Do not collect customer or retailer payments into a personal bank account, personal UPI ID, or wallet under any circumstances.</li>
            <li><strong>Zero Cash Collection:</strong> All customer payments must be remitted directly to official Kamadhenu Honey Farms accounts.</li>
            <li><strong>No Unauthorized Price Alteration:</strong> Do not modify company product prices, wholesale rates, or MRP without explicit written approval from management.</li>
            <li><strong>No False Product Claims:</strong> Do not make unsubstantiated medical guarantees or false quality claims (e.g. claiming uncertified organic status). Stick strictly to official product specifications.</li>
            <li><strong>No Unauthorized Discounts or Credit Promises:</strong> Do not promise unauthorized discounts or unapproved credit terms to retailers.</li>
            <li><strong>No Misrepresentation:</strong> Do not represent yourself as the owner, director, or partner of Kamadhenu Honey Farms. Represent yourself accurately as an authorized Sales Executive.</li>
            <li><strong>Protection of Client Information:</strong> Maintain strict confidentiality regarding retailer lists, distributor contacts, and sales figures.</li>
            <li><strong>Adherence to Official Workflow:</strong> Follow established sales reporting, order entry, and customer feedback processes.</li>
          </ol>

          ${signatureSectionHtml}
        </div>
      `;
    }

    case 'COMPLETE_ONBOARDING_PACK': {
      return `
        <div style="font-family: sans-serif; max-width: 850px; margin: 0 auto; background: #fff; padding: 32px; color: #2d3748; line-height: 1.6;">
          <div style="text-align: center; border: 3px double #d4af37; padding: 40px; margin-bottom: 40px; border-radius: 8px; background: #faf8f2;">
            <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #d4af37, #b8860b); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 32px; margin-bottom: 16px; margin-left: auto; margin-right: auto;">
              KHF
            </div>
            <h1 style="font-family: serif; font-size: 32px; color: #1a202c; margin: 0 0 8px 0;">KAMADHENU HONEY FARMS</h1>
            <p style="font-size: 14px; font-weight: bold; color: #b8860b; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 24px 0;">
              COMPLETE CANDIDATE ONBOARDING & FIELD AUTHORIZATION PACK
            </p>
            <div style="border-top: 1px solid #ebd48e; border-bottom: 1px solid #ebd48e; padding: 16px; display: inline-block; text-align: left; font-size: 12px; width: 80%;">
              <strong>Candidate Name:</strong> ${data.fullName}<br/>
              <strong>Application ID:</strong> ${data.applicationNo}<br/>
              <strong>Designated Role:</strong> ${data.engagementType}<br/>
              <strong>Working Territory:</strong> ${data.workingTerritory}<br/>
              <strong>Issue Date:</strong> ${data.issueDate}<br/>
              <strong>Document Reference:</strong> ${data.documentNo}
            </div>
          </div>

          <div style="page-break-before: always;">
            ${generateDocumentHtml('OFFER_LETTER', data)}
          </div>
          <div style="page-break-before: always;">
            ${generateDocumentHtml('AUTHORIZATION_LETTER', data)}
          </div>
          <div style="page-break-before: always;">
            ${generateDocumentHtml('COMMISSION_POLICY', data)}
          </div>
          <div style="page-break-before: always;">
            ${generateDocumentHtml('PRICE_CATALOGUE', data)}
          </div>
          <div style="page-break-before: always;">
            ${generateDocumentHtml('SALES_GUIDELINES', data)}
          </div>
          <div style="page-break-before: always;">
            ${generateDocumentHtml('CODE_OF_CONDUCT', data)}
          </div>
        </div>
      `;
    }

    default:
      return `<p>Document not found.</p>`;
  }
}
