# Research: Responsive Self Service Procurement in Oracle Fusion

- Slug: Responsive-Self-Service-Procurement · Duration: 30m · Researched: 2026-11-23 · Sources: 20
- Focus (from probe): Practitioner-depth tour of the requisition flow (shop → requisition → approval → PO → receipt → invoice) and the setups that steer each step (requisitioning/procurement BU, content zones, catalogs, smart forms, punchout, AMX approval rules, buyer assignment, requisition-to-PO automation, document styles), plus how the Responsive/Redwood UI differs from classic SSP and what changed in 24D to 26D.

Naming note: Oracle's older docs called this app the "Responsive Self Service Procurement application". From 24D on, readiness material calls the same app "Redwood Self Service Procurement". Its menu entry is "Purchase Requisitions (New)" · [S1]. Its phased-access privilege code still contains "PWA" (progressive web app): POR_MANAGE_REQ_WITH_PWA_PRIV · [S2]. This pack treats "Responsive" and "Redwood SSP" as the same app (see Gaps).

## 1. Key concepts (dependency chain)
1. **Requisitioning BU and Procurement BU**: a requisitioning BU raises demand and holds requisition defaults. The procurement BUs that serve it (one or more) turn that demand into orders · [S3] [S4]
2. **Requester access** (needs 1): the user needs data access to an active BU with the Requisitioning business function and a role with Manage Requisition. Their preferences set the default requisitioning BU, deliver-to, and charge account · [S5] [S6] [S1]
3. **Responsive (Redwood) SSP vs classic SSP** (needs 2): a fully responsive app (Purchase Requisitions (New)) that you switch on through opt-in features, for everyone or in phases · [S1] [S2]
4. **Shopping content** (needs 1): local catalogs, punchout catalogs, informational catalogs, public shopping lists, and smart forms, all defined in a procurement BU · [S7] [S8] [S9]
5. **Content zones** (needs 1, 4): the security layer that decides which requesters see which content (by requisitioning BU, worker, or deliver-to location) · [S4] [S7]
6. **Requisition creation** (needs 2, 3, 5): search or browse, add to cart, edit details, submit · [S10]
7. **Requisition approval** (needs 6): rules authored in Manage Requisition Approvals run on the Approval Management Extension (AMX) engine across four seeded stages. Task behavior is set in BPM Worklist · [S11] [S12]
8. **Buyer assignment** (needs 7): each line gets a buyer by precedence: the requester's suggestion, buyer assignment rules, the item default buyer, then the procurement BU default buyer · [S13]
9. **Requisition to PO** (needs 7, 8): either touchless (agreement flags) or manual (Process Requisitions document builder: document type, document style, grouping) · [S14] [S15] [S16]
10. **Receipt and invoice** (needs 9): the match approval level decides whether a receipt is needed. The Redwood app lets requesters fix invoice holds · [S17] [S18]
11. **Current changes, 24D to 26D** (needs 3): Redwood became the default, and approvals visibility, AI and catalog admin moved to Redwood pages · [S1] [S2] [S19] [S20]

## 2. Claims
### Requisitioning BU and Procurement BU
- The Configure Requisitioning Business Function task sets the default values and behaviors for requisitions and POs created for a requisitioning BU · [S3]
- Requisitioning-section settings include Default Deliver-to Organization (which also sets which item master items are visible), default Line Type, One-Time Location, Allow one-time addresses, and "Reapproval required for changes made during an active approval process" · [S3]
- "Approval required for buyer modified lines" re-triggers approval when a buyer edits a requisition line. "Enable approval override" enables approval overrides · [S3]
- A requisitioning BU can be served by several procurement BUs. If none can be determined from the line, the Default Procurement BU processes all lines · [S3]
- Price Change Tolerance (percent or amount; the stricter applies) blocks submitting a PO whose price moved beyond tolerance from the requisition line · [S3]
- Cancel Unfulfilled Demand: Always (PO cancel doesn't reinstate demand), Never (demand is reinstated for another PO), Optional (the buyer chooses) · [S3]
- To shop a content zone, the requester's requisitioning BU must be a client of the zone's procurement BU · [S4]

### Requester access
- Missing access produces "You aren't assigned to a business unit that supports requisitioning. (POR-2010674)". The fix is Manage Business Unit Data Access for Users, pointing at an active BU with the Requisitioning business function · [S5]
- Preferences (Purchase Requisitions (New) > Preferences) hold the default requisitioning BU, delivery defaults (requester, deliver-to location, destination type Expense or Inventory, subinventory), project costing defaults, and charge accounts with nicknames · [S6]
- Preferences are validated at login. A missing required value opens the preferences window, and you must fix it before creating requisitions · [S6]
- In phased mode, a user needs Manage Requisition with the Redwood Self Service Procurement Application (POR_MANAGE_REQ_WITH_PWA_PRIV) to see Purchase Requisitions (New) · [S2]
- Once "Enable the Redwood Version as the Default…" is opted in, that extra privilege isn't needed. Manage Requisition (POR_MANAGE_REQUISITION_PRIV) suffices · [S1]

### Responsive (Redwood) SSP vs classic
- Unlike classic, the Redwood SSP app is fully responsive and usable on mobile, desktop, and other devices · [S1]
- There are two opt-ins. "Enable the Redwood Version as the Default Self Service Procurement Application" hides the classic Purchase Requisitions menu and the Shop and Manage Requisitions quick actions for everyone. "Procure Goods and Services Using the Redwood Self Service Procurement Application" is the phased route where both apps coexist · [S1]
- For new installations, the "Redwood as default" feature is enabled by default. Oracle says to opt out only if you need something that exists in classic but not yet in Redwood · [S1]
- With it enabled, the Shop (New) and My Requisitions (New) quick actions appear, and global-search drill-downs open the Redwood Requisition Details page · [S1]
- In 24D, notification links still opened classic pages for requisitions with dual-UOM items, Work Order destination, P-Card references, consigned items, or an Emergency PO request · [S1]
- As of 24D, Redwood didn't replace classic in three flows: catalog admins adding to public shopping lists, buyers using Add from Catalog or Update from Catalog in Process Requisitions, and maintenance managers creating requisitions for work orders · [S1]
- Enabling the Redwood app for the first time requires setting up Elastic Search for catalog shopping and for requisitions · [S1]
- From 25B, the Cart's View Approvers action shows approvers, FYI approvers, and the names of the approval rules that added each one. Requesters can add ad hoc approvers and mark them FYI · [S2]

### Shopping content: catalogs, punchout, smart forms
- A content zone can group local, punchout, informational, public shopping list, and smart form content. Requesters search and browse all of it together, however it is grouped · [S7]
- Local content can be restricted by purchasing category and agreement, with inclusion and exclusion rules · [S7]
- Smart forms are noncatalog request forms for goods-based or fixed-price-services request types. They can hold defaults, attachments, and information templates that collect extra fields · [S8]
- Smart forms are created in a procurement BU and shared with the requisitioning BUs it serves through content zones · [S8]
- If a smart form is associated with a contract purchase agreement, approved lines from it become POs automatically, with no buyer step · [S8]
- Punchout opens a supplier-hosted catalog. The supplier's cart returns as requisition lines on the Edit Requisition page · [S9]
- Punchout supports model 1a (Oracle native XML) and model 1b (cXML). cXML carts can return user-defined line types · [S9]
- Punchout suits configurable items or items with volatile, dynamic pricing that are costly to keep in a buyer-hosted catalog · [S9]
- A valid contract agreement number returned in the punchout cart is stored on the line, which allows a PO to be created automatically after approval · [S9]

### Content zones
- Each content zone is created for a procurement BU and marked for one usage. Procurement usage covers buyers on POs, agreements, and shopping lists. Requisitioning usage covers requesters, and buyers in Process Requisitions · [S4]
- Requisitioning zones can be secured by requisitioning BU, by worker, or by deliver-to location. "Available to all procurement users" exists only for procurement usage · [S4]
- With location security, the deliver-to location in the requester's preferences must be assigned to the zone · [S4]
- Content is invisible to users until the catalog administrator associates it with a content zone · [S7]

### Requisition creation
- Flow: Navigator > Procurement > Purchase Requisitions (New). Search, or browse Featured categories, then Add to Cart and open the Cart. Edit requisition details (delivery location, project, attachments), then Submit. The requisition then shows under My recent requisitions · [S10]
- Search results are ordered by relevance, highest first · [S10]

### Requisition approval (AMX/BPM)
- Requisition approval rules are configured in Setup and Maintenance > Manage Requisition Approvals (Approval Management functional area) · [S11]
- Four seeded stages run in sequence: Header Preapproval, Header, Header Postapproval, Postapproval FYI · [S11]
- Header Preapproval is for cases such as emergency requisitions. The Header stage is often used for amount-based (fiscal) approvals · [S11]
- Non-FYI participants are rule-based. Each rule picks a list builder: Supervisory, Position, Job Level, Single User, User-Defined Routing, or Approval Groups · [S11]
- Participants route in serial (Header Hierarchy, 2, 3) or in parallel (Consensus: all must approve; First Responder Wins: the first response decides) · [S11]
- The approval rules page works with the Approval Management Extension (AMX) rules engine. Task behavior (who may add participants, auto-claim, early completion, aggregation) is set on the BPM Worklist Task Configuration page · [S12]
- By default the requisition task completes on Reject, and task aggregation is "Once per task" (an approver returned by several rules gets one task) · [S12]

### Buyer assignment
- A buyer is assigned only when the requester didn't suggest one. Precedence: buyer assignment rules (Manage Buyer Assignment Rules), then the item's default buyer in the deliver-to organization, then the default buyer from Configure Procurement Business Function · [S13]
- With the profile "Use Same Buyer for all Lines in a Requisition", the first line's buyer is copied to all lines. With "Assign Requisition Lines to the Buyer on the Source Agreement" opted in, agreement-sourced lines skip the rules and take the agreement's buyer · [S13]

### Requisition to PO
- On an agreement's Controls tab, "Automatically generate orders" turns approved requisitions into POs. "Automatically submit for approval" also submits them. Picking only the first keeps a manual review for high-value items · [S14]
- To enable automation, the agreement must be enabled for the relevant requisitioning BUs and supplier sites in its Business Unit Access region · [S14]
- Automation fails if the line has no valid buyer, needs negotiation, lacks a supplier or site, has an item not purchasable in the procurement BU's default inventory org, has no valid source agreement, is sourced to a contract agreement without "Negotiated" checked, or the agreement lacks "Automatically generate orders" · [S15]
- If "Consolidate Online Requisitions into Few Purchase Orders" is on and the agreement groups requisitions, no PO appears until Generate Orders runs · [S15]
- Manual path: a buyer uses Process Requisitions to select demand, adds it to the document builder, and sets document type, document style, and line grouping to create an order or negotiation · [S16]
- If descriptive flexfields are copied from requisition lines to PO lines, lines can't be grouped in the document builder · [S16]

### Receipt and invoice
- Match approval level: 2-way (PO and invoice), 3-way (PO, receipt, invoice), 4-way (adds inspection-accepted quantity), each within tolerance before payment · [S17]
- The match approval level is independent of the invoice match option, which decides whether Payables matches the invoice to the PO or to the receipt · [S17]
- The Redwood app flags lines whose invoices are on hold. For QTY ORD or AMT ORD holds, the requester raises a change order. For QTY REC or AMT REC holds on 3-way, direct-delivery, expense lines, the requester uses Confirm Receipt, which auto-creates a receipt · [S18]
- Lines are flagged only after the "Update Requisition Line Action Required Code" scheduled job runs · [S18]

### Current changes (24D to 26D)
- 26A Redwood SSP features include category recommendation for noncatalog requests, preferred-source shopping lists, Check Funds on Requisition Details, barcode catalog search, an optional requested delivery date (except planned items and transfers), and viewing PO approvers through document history · [S19]
- 26D adds a Catalog Administration landing page, controlled by profile Redwood Catalog Setup Pages Enabled (ORA_POR_REDWOOD_CATALOG_SETUP_ENABLED), which defaults to No · [S20]
- On that landing page, Quick access searches catalogs, content zones, public shopping lists, catalog agreements, information templates, and smart forms. The Shopping Catalog Agreements task moves off the Purchasing landing page · [S20]

## 3. Analogies for ELI5
1. **Corporate food court** (pick this for the overview): the procurement BU is the kitchen that stocks the dishes (catalogs, smart forms, punchout stalls). Content zones are wristbands that decide which counters each diner can use. The requisition is the order ticket, approval is the manager's sign-off, and the buyer is the expediter who turns the ticket into a PO for the supplier. · where it breaks: there is no food-court equivalent of 2-, 3-, or 4-way invoice matching.
2. **Rail switching yard** (pick this for requisition-to-PO): an approved line rolls to a switch. With a valid agreement and the automation flags set, it takes the express track to a PO. Otherwise it goes to the buyer's siding (Process Requisitions). · where it breaks: buyer assignment happens before the switch, not on the track.
3. **Airport security lanes**: content zones are lanes keyed by group (BU, worker, location). · where it breaks: this covers content security only.

The learner already uses the app, so use the analogies to frame setup levers, not basic UI.

## 4. Visual metaphors
| Concept | What the animation could show | Step-by-step state changes | 3D needed? | Why |
|---|---|---|---|---|
| End-to-end flow + levers | Pipeline: Shop → Cart → Approval → Buyer → PO → Receipt → Invoice, with lever chips under each stage | each stage lights up in turn, then its levers drop in (content zone, AMX rule, buyer rule, agreement flags, match level) | no | a linear process reads best flat |
| BU structure | Req BUs on the left, Proc BUs on the right, service-provider arrows between them | add Req BU → link to Proc BU → mark Default Proc BU → a content zone hangs off the Proc BU and fans out to the Req BUs | no | a relationship diagram |
| Content zones | A filter funnel: all content → zone rule → the tiles requester X sees | toggle security by BU, worker, or location and watch the visible tiles change | no | filtering is easy to see flat |
| Approval stages | Four swimlanes with serial and parallel participants | a req card passes Preapproval → Header (Hierarchy 1/2/3) → Postapproval → FYI. Consensus vs First Responder Wins votes | no | swimlanes |
| Touchless vs manual PO | A decision switch after approval | line with agreement, buyer, Negotiated, and auto-generate set → PO. A missing flag diverts it to Process Requisitions → document builder (type, style, grouping) | no | a decision tree |
| 3-way match hold | Three bars: PO, receipt, and invoice quantities | invoice > receipt → QTY REC hold → Confirm Receipt → bars align → hold released | no | quantities compared |
| Classic vs Redwood | Split screen: classic menu vs Purchase Requisitions (New) on a phone and a laptop | opt-in toggle: phased (both visible) vs default (classic hidden, exception badges stay) | no | before/after |

## 5. Common misconceptions
- **Myth:** An approved requisition always becomes a PO automatically. · **Why it's wrong:** automation needs a valid buyer, a supplier and site, an agreement with "Automatically generate orders", and "Negotiated" checked for contract-agreement lines. Otherwise the line waits for a buyer in Process Requisitions. · **Correct idea:** touchless ordering is configured per agreement and conditional · [S14] [S15]
- **Myth:** Creating a catalog makes it visible to requesters. · **Why it's wrong:** content must be associated with a content zone that covers the requester · **Correct idea:** catalogs define content, content zones grant access · [S7] [S4]
- **Myth:** Enabling Redwood SSP removes classic everywhere. · **Why it's wrong:** phased mode keeps both. Even default mode left some flows on classic in 24D (public shopping lists, Add or Update from Catalog, maintenance work orders) · **Correct idea:** it switches entry points, with listed exceptions · [S1]
- **Myth:** Buyer assignment rules always pick the buyer. · **Why it's wrong:** a requester-suggested buyer wins, and the source-agreement-buyer feature bypasses the rules · **Correct idea:** there is a precedence chain · [S13]
- **Myth:** Smart-form (noncatalog) requests always need a buyer. · **Why it's wrong:** a smart form tied to a contract purchase agreement auto-creates POs · [S8]
- **Myth:** Approval rules live in BPM Worklist. · **Why it's wrong:** rules are authored in Manage Requisition Approvals (AMX). BPM Worklist holds task configuration · [S11] [S12]

## 6. Trade-offs / when (not) to use
- Use "Redwood as default" when you're ready to move all users at once · [S1]
- Use the phased opt-in to pilot with a group (grant POR_MANAGE_REQ_WITH_PWA_PRIV) while others stay on classic · [S1] [S2]
- Avoid Redwood default (opt out) only when a needed capability is still classic-only · [S1]
- Punchout vs local catalog: punchout suits configurable or dynamically priced items and the supplier keeps content fresh. Local catalogs let you filter by agreement and category · [S9] [S7]
- Auto-generate vs auto-generate plus auto-submit: use generate-only for high-value items so a buyer reviews the PO first · [S14]
- Content zone security: by requisitioning BU is broad and simple. By worker or location is granular but means more upkeep · [S4]
- Redwood pros: responsive on any device, and approvers and rule names visible at checkout. Redwood cons: one-time Elastic Search setup, and some flows still classic · [S1] [S2]

## 7. Timeline / story
- 24D: the "Enable the Redwood Version as the Default Self Service Procurement Application" opt-in arrives, enabled by default for new installs · [S1]
- 25B: FYI approvers and approval rule names become visible during checkout · [S2]
- 26A: a wave of Redwood SSP features (category recommendation, barcode search, check funds, preferred-source shopping lists) · [S19]
- 26D: the Redwood Catalog Administration landing page, behind a profile option · [S20]

## 8. Prerequisites and next topics
- Prerequisites: Fusion enterprise structures (business units and business functions, for the req/procurement BU split), purchase agreements (BPA/CPA, which drive automation)
- Next: Process Requisitions and document styles (the buyer side), AMX approval rule design (complex routing), Receiving and Payables matching (receipts and holds), Redwood catalog administration (content setup)
- Broader topic this is a kind/part of: Oracle Fusion Cloud Procurement (Procure-to-Pay)

## 9. Suggested quiz items
- BU access: A requester sees POR-2010674. What's the fix? · answer: grant data access to an active BU with the Requisitioning business function · common wrong answer: assign the Procurement Agent role · [S5]
- Content zones: Which option is NOT available for a requisitioning-usage zone? · answer: Available to all procurement users · common wrong answer: Secured by worker · [S4]
- Smart forms: How can smart-form requests skip the buyer? · answer: associate the smart form with a contract purchase agreement · common wrong answer: set a default buyer on the form · [S8]
- Approvals: List the seeded requisition stages in order · answer: Header Preapproval, Header, Header Postapproval, Postapproval FYI · common wrong answer: Preapproval, Terms, Postapproval, FYI · [S11]
- Approvals: Consensus vs First Responder Wins? · answer: all must approve vs the first response decides · common wrong answer: both are serial · [S11]
- AMX vs BPM: Where is task aggregation set, and what's the requisition default? · answer: BPM Worklist Task Configuration, Once per task · common wrong answer: inside an approval rule · [S12]
- Buyer: What decides the buyer first? · answer: the requester-suggested buyer, then rules, then the item default, then the procurement BU default · common wrong answer: buyer assignment rules · [S13]
- Automation: A CPA-sourced approved line has no PO. Likely cause? · answer: "Negotiated" not checked on the line · common wrong answer: approval not finished · [S15]
- Automation: What does "Automatically submit for approval" add? · answer: it also submits the generated PO for approval · common wrong answer: it skips requisition approval · [S14]
- Redwood: Which privilege gives pilot users the new app in phased mode? · answer: POR_MANAGE_REQ_WITH_PWA_PRIV · common wrong answer: POR_MANAGE_REQUISITION_PRIV alone · [S2]
- Redwood: What one-time technical setup is needed for first use? · answer: Elastic Search for catalog shopping and requisitions · common wrong answer: none · [S1]
- Invoice holds: When does Confirm Receipt appear? · answer: 3-way, direct delivery, expense line, QTY REC or AMT REC hold, after the Action Required Code job runs · common wrong answer: any invoice hold · [S18]
- Match: What does 4-way add over 3-way? · answer: inspection-accepted quantity · common wrong answer: supplier acknowledgment · [S17]
- Requisitioning BU: Cancel Unfulfilled Demand = Never. What happens when the PO is cancelled? · answer: requisition demand is reinstated for another PO · common wrong answer: the requisition is cancelled · [S3]

## 10. Gaps and conflicts
- I could not verify the official classic SSP retirement or "Redwood mandatory" timeline. The Oracle Customer Connect posts (first "retiring in 25A", later revised) need a login and could not be opened.
- Oracle removed the "Responsive Self Service Procurement" doc pages (24B/24D), which now redirect to the 26D landing page. Facts come from current 26D books and readiness notes. "Responsive = Redwood SSP" is inferred from the shared menu (Purchase Requisitions (New)), the PWA privilege code, and identical capability descriptions, not from an explicit rename statement.
- Document Style Options (the detailed page) was not opened. Document style appears only as a document-builder choice in Process Requisitions.
- Newer approval items (rule deployment via ESS above 100 rules, ad hoc approver positions in 26B, the Redwood Buyer Assignment Rules page in 26C, the Purchase Requisition Status Advisor AI agent in 25C) appeared in search results or pages I opened, but they are not cited here, to keep the source count down.
- The 24D list of flows that still use classic may have shrunk since (for example, 26A maintenance navigation to Redwood SSP). Verify it on the current release.
- The source count (20) is above the 8-12 guideline for 30m because the probe asked for balanced flow-plus-setup coverage. Each source is the narrowest official Oracle page for one lever.
