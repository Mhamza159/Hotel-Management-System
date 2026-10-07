const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
} = require(path.resolve(__dirname, '../backend/node_modules/docx'));

const createDoc = async () => {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: 22, // 11pt
            color: '2D3748',
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1000,
              right: 1000,
              bottom: 1000,
              left: 1000,
            },
          },
        },
        children: [
          // Title
          new Paragraph({
            text: 'GRAND HORIZON LUXURY HOTEL MANAGEMENT SYSTEM',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            run: {
              bold: true,
              size: 36,
              color: '1A365D',
            },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: 'Full-Stack Enterprise Architecture & Production Portfolio',
                bold: true,
                size: 26,
                color: '2B6CB0',
              }),
            ],
          }),

          // Candidate Info Box
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'Lead Developer: ', bold: true, color: '1A365D' }),
              new TextRun({ text: 'M Hamza Hakim (Mhamza159)   |   ' }),
              new TextRun({ text: 'Project Status: ', bold: true, color: '1A365D' }),
              new TextRun({ text: '100% Production Live on Vercel', color: '276749', bold: true }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: 'Live Web App: ', bold: true }),
              new TextRun({ text: 'https://hotel-management-system-six-topaz.vercel.app/', color: '2B6CB0' }),
            ],
          }),

          // Divider
          new Paragraph({
            spacing: { after: 200 },
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E0' },
            },
          }),

          // Section 1: Pre-Configured Demo Credentials
          new Paragraph({
            text: '1. PRE-CONFIGURED DEMO CREDENTIALS (READY FOR LIVE TESTING)',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 140 },
            run: { bold: true, color: '1A365D', size: 28 },
          }),
          new Paragraph({
            text: 'You can immediately log in to test any role using the pre-seeded credentials below:',
            spacing: { after: 120 },
          }),

          // Credentials Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: '1A365D', type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Role', bold: true, color: 'FFFFFF' })] })],
                  }),
                  new TableCell({
                    shading: { fill: '1A365D', type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Email', bold: true, color: 'FFFFFF' })] })],
                  }),
                  new TableCell({
                    shading: { fill: '1A365D', type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Password', bold: true, color: 'FFFFFF' })] })],
                  }),
                  new TableCell({
                    shading: { fill: '1A365D', type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Access / Key Features', bold: true, color: 'FFFFFF' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '👑 Super Admin', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph('admin@hotel.com')] }),
                  new TableCell({ children: [new Paragraph('Password123!')] }),
                  new TableCell({ children: [new Paragraph('Full PBAC Matrix, Revenue Analytics, Immutable Audit Logs, Staff Admin')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '🛎️ Front Desk', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph('reception@hotel.com')] }),
                  new TableCell({ children: [new Paragraph('Password123!')] }),
                  new TableCell({ children: [new Paragraph('Walk-In Booking Modal, Arrivals/Departures, Keycards, Cash Settlement')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '🧹 Housekeeping', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph('housekeeping@hotel.com')] }),
                  new TableCell({ children: [new Paragraph('Password123!')] }),
                  new TableCell({ children: [new Paragraph('Real-time Kanban Board (Dirty/Cleaning/Clean), Priority VIP Flagging')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '👤 Guest / User', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph('hamza@hotel.com')] }),
                  new TableCell({ children: [new Paragraph('Password123!')] }),
                  new TableCell({ children: [new Paragraph('Guest Portal, Booking History, PDF Invoices, Reviews, Wishlists')] }),
                ],
              }),
            ],
          }),

          // Section 2: Executive Summary
          new Paragraph({
            text: '2. EXECUTIVE SYSTEM SUMMARY',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 140 },
            run: { bold: true, color: '1A365D', size: 28 },
          }),
          new Paragraph({
            text: 'Grand Horizon is a high-performance, enterprise-grade Hospitality Management Platform engineered to modernize and unify hotel operations into a single cohesive operating system.',
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '• Zero Double-Booking Guarantee: ', bold: true }),
              new TextRun({ text: 'Atomic MongoDB ACID transactional isolation prevents concurrent overlapping bookings.' }),
            ],
            spacing: { after: 60 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '• Granular PBAC Security: ', bold: true }),
              new TextRun({ text: 'Role & Permission-Based Access Control dynamically guards both UI buttons/routes and backend APIs.' }),
            ],
            spacing: { after: 60 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '• Zero Optimistic UI: ', bold: true }),
              new TextRun({ text: 'Guarantees reliable, uncorrupted operations by waiting for 200 OK backend receipts before updating state.' }),
            ],
            spacing: { after: 60 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '• Multi-Tenant Cloud Ready: ', bold: true }),
              new TextRun({ text: 'Deployed serverless on Vercel with automated connection caching to MongoDB Atlas Cloud.' }),
            ],
            spacing: { after: 200 },
          }),

          // Section 3: Technology Stack
          new Paragraph({
            text: '3. COMPLETE TECHNOLOGY STACK',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 140 },
            run: { bold: true, color: '1A365D', size: 28 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Frontend: ', bold: true, color: '2B6CB0' }),
              new TextRun({ text: 'React 18.3, Vite, Material UI (MUI v5) custom theme, Tailwind CSS, Framer Motion, Zustand State Stores, TanStack React Query v5, Axios Interceptors.' }),
            ],
            spacing: { after: 80 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Backend: ', bold: true, color: '2B6CB0' }),
              new TextRun({ text: 'Node.js LTS, Express.js 5 REST APIs, Mongoose ORM, Joi Validation schemas, Winston structured multi-transport logger, Helmet security, Sliding-window rate limiters.' }),
            ],
            spacing: { after: 80 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Database & Cloud: ', bold: true, color: '2B6CB0' }),
              new TextRun({ text: 'MongoDB Atlas Cloud Cluster, Vercel Serverless Hosting, Stripe Payment Gateway, Cloudinary Media CDN, PDFKit invoice generator.' }),
            ],
            spacing: { after: 200 },
          }),

          // Section 4: Operational Domains & Features
          new Paragraph({
            text: '4. MAJOR SYSTEM MODULES & OPERATIONAL CAPABILITIES',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 140 },
            run: { bold: true, color: '1A365D', size: 28 },
          }),

          // Module 1
          new Paragraph({
            text: 'A. Public Guest Booking & Stays Portal',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 100, after: 80 },
            run: { bold: true, color: '2B6CB0', size: 24 },
          }),
          new Paragraph({ text: '1. Luxury Suite Catalog: Live availability, high-res galleries, filter by capacity and suite tier.', spacing: { after: 40 } }),
          new Paragraph({ text: '2. Multi-Discount Checkout: Atomic reservation, promo coupons (WELCOME10, SUMMER20), and idempotency protection.', spacing: { after: 40 } }),
          new Paragraph({ text: '3. Instant Invoicing: Auto-generated downloadable PDF receipts rendered in-browser.', spacing: { after: 40 } }),
          new Paragraph({ text: '4. Guest Portal: View active/past stays, initiate policy-driven refunds, wishlist favorites, and submit verified reviews.', spacing: { after: 140 } }),

          // Module 2
          new Paragraph({
            text: 'B. Front Desk Flight-Ops Cockpit (/desk)',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 100, after: 80 },
            run: { bold: true, color: '2B6CB0', size: 24 },
          }),
          new Paragraph({ text: '1. Walk-In Booking Engine: Complete guest reservation in under 30 seconds with immediate room allocation.', spacing: { after: 40 } }),
          new Paragraph({ text: '2. Arrivals & Departures: Live checklist of daily arrivals and departures with instant check-in.', spacing: { after: 40 } }),
          new Paragraph({ text: '3. Keycard Lifecycle: Digital NFC keycard issuance, re-issue on lost card, and active count badge.', spacing: { after: 40 } }),
          new Paragraph({ text: '4. Cash & Card Settlements: Record on-site cash payments and prevent checkout if dues remain unsettled.', spacing: { after: 140 } }),

          // Module 3
          new Paragraph({
            text: 'C. Housekeeping Cleanliness Kanban (/housekeeping)',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 100, after: 80 },
            run: { bold: true, color: '2B6CB0', size: 24 },
          }),
          new Paragraph({ text: '1. Authoritative 4-State Board: Dirty -> In-Progress -> Clean & Inspected -> Maintenance.', spacing: { after: 40 } }),
          new Paragraph({ text: '2. Automatic State Transitions: Front desk check-out automatically marks suite as Dirty for staff.', spacing: { after: 40 } }),
          new Paragraph({ text: '3. Priority VIP Tagging: Visual badges identifying rooms with incoming high-tier guests.', spacing: { after: 140 } }),

          // Module 4
          new Paragraph({
            text: 'D. Super-Admin & Governance Console (/admin)',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 100, after: 80 },
            run: { bold: true, color: '2B6CB0', size: 24 },
          }),
          new Paragraph({ text: '1. Dynamic PBAC Matrix: Assign and toggle 15+ micro-permissions per staff member without modifying code.', spacing: { after: 40 } }),
          new Paragraph({ text: '2. Financial & Occupancy Analytics: Live revenue metrics, Occupancy rate, ADR, and RevPAR KPI charts.', spacing: { after: 40 } }),
          new Paragraph({ text: '3. Cryptographic Audit Trail: Append-only log tracking who performed which action, payload diff, IP, and UTC timestamp.', spacing: { after: 40 } }),
          new Paragraph({ text: '4. Suite Management & Review Moderation: Add/edit rooms and moderate guest reviews.', spacing: { after: 40 } }),
          new Paragraph({ text: '5. Staff Directory & Role Provisioning: Dedicated employee onboarding and custom baseline permission templates.', spacing: { after: 140 } }),

          // Module 5
          new Paragraph({
            text: 'E. Advanced Cross-Cutting Modules & Innovations',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 100, after: 80 },
            run: { bold: true, color: '2B6CB0', size: 24 },
          }),
          new Paragraph({ text: '1. Spotlight Command Palette (Ctrl+K): Instant keyboard-driven navigation across suites, bookings, and controls in <2 keystrokes.', spacing: { after: 40 } }),
          new Paragraph({ text: '2. Multi-Role AI Operations Copilot: Dual-mode assistant (Guest Concierge policy advisor + Staff operations lookups).', spacing: { after: 40 } }),
          new Paragraph({ text: '3. Tiered Guest Loyalty Rewards (Bronze/Silver/Gold/Platinum): Points accrual engine unlocking exclusive member perks.', spacing: { after: 40 } }),
          new Paragraph({ text: '4. High-Demand Room Waitlists: Automated waitlist subscriptions when inventory is sold out, auto-triggering on cancellations.', spacing: { after: 40 } }),
          new Paragraph({ text: '5. Automated Background Watchdog Cron: 15-minute background worker auto-releasing unpaid draft reservations.', spacing: { after: 40 } }),
          new Paragraph({ text: '6. Bespoke Multi-Themed Design System: Custom Obsidian Dark (Staff/Admin), Verde Emerald (Guest), Warm Planner (Housekeeping).', spacing: { after: 40 } }),
          new Paragraph({ text: '7. Cloudinary Media Asset Management: Multi-image drag-and-drop suite media modal with CDN optimization.', spacing: { after: 40 } }),
          new Paragraph({ text: '8. Interactive Swagger / OpenAPI Documentation: Live API explorer available at /api-docs.', spacing: { after: 200 } }),

          // Section 5: Testing & QA
          new Paragraph({
            text: '5. TESTING & QUALITY ASSURANCE RECORD',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 140 },
            run: { bold: true, color: '1A365D', size: 28 },
          }),
          new Paragraph({ text: '• 100% Automated Playwright E2E Tests: Fully tested across Public, Desk, Housekeeping, and Super-Admin.', spacing: { after: 60 } }),
          new Paragraph({ text: '• 146 Unit & Integration Tests Passing: Concurrency, double-booking prevention, PBAC security gates verified.', spacing: { after: 60 } }),
          new Paragraph({ text: '• Clean Production Builds: Vite client compiles in 21.7s with zero errors or warnings.', spacing: { after: 200 } }),

          // Footer
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 300 },
            children: [
              new TextRun({ text: 'Project verified and ready for technical team review & production demonstration.', italics: true, color: '718096' }),
            ],
          }),
        ],
      },
    ],
  });

  const outputPath = path.resolve(__dirname, '../PROJECT_PORTFOLIO_EXECUTIVE_SUMMARY.docx');
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  console.log('Successfully generated Word file at:', outputPath);
};

createDoc().catch(console.error);
