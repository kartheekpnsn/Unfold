# Responsive Self Service Procurement in Oracle Fusion: lesson PRD

- **Slug:** responsive-self-service-procurement
- **Folder:** Responsive-Self-Service-Procurement
- **Duration:** 30m
- **Level:** beginner (from grill.md; the learner uses the app at work but answered "not sure" at every level, including recall)
- **Domain:** tech
- **Summary:** How a requisition in Oracle Fusion's Responsive (Redwood) Self Service Procurement travels from shopping to a paid invoice, and which setup lever controls each step.
- **Player version:** 1.0.0

## 1. Learner profile
- Why: using it at work (from probe.md).
- Starting point: self-rated "use it, want depth", but the grill shows no working model of the flow or the setup.
- Solid: none.
- Shaky: none.
- Unknown: every concept: the requisitioning vs procurement BU split, requester access, Redwood vs classic, shopping content, content zones, requisition creation, approval (AMX/BPM), buyer assignment, requisition to PO, receipt and invoice, and 24D-26D changes.
- Misconceptions detected: none revealed (only "not sure" answers). Treat every myth in research.md §5 as live.
- Pitch: build the end-to-end mental model first (one pipeline, one stage at a time) in plain language. Then attach the **setup task name** to each stage, so the lesson doubles as a work reference. Keep release history short. No jargon in ELI5 until the last step.

## 2. Learning objectives
1. **Trace** a requisition through the six stages: Shop → Cart/Submit → Approve → Buyer → PO → Receipt and Invoice.
2. **Explain** why a requester can't see a catalog (content zones) or can't create requisitions at all (requisitioning BU access, POR-2010674).
3. **Distinguish** where approval *rules* live (Manage Requisition Approvals, AMX) from where approval *task behavior* lives (BPM Worklist).
4. **Predict** whether an approved line becomes a PO automatically or waits in Process Requisitions, from agreement flags, buyer, supplier/site and the Negotiated flag.
5. **Name** the setup task behind each stage (Configure Requisitioning Business Function, content zones, Manage Buyer Assignment Rules, agreement Controls, match approval level).

## 3. Tabs

### 3.1 ELI5 (`eli5`, kind `stepper`), 4 steps, analogy: corporate food court (research.md §3.1)

| # | Step title | Narration intent | Cite | Scene id | Mode | What the scene shows (state) |
|---|---|---|---|---|---|---|
| 1 | The company food court | Kitchens stock dishes; diners pick from counters they're allowed at | S7 | `food-court` | svg | `{stage:"kitchen"}`: two kitchens (one labeled "kitchen" only), counters with dish tiles, a diner |
| 2 | Wristbands decide your counters | Each diner's wristband opens some counters, not all; a new dish no wristband covers is invisible | S7, S4 | `food-court` | svg | `{stage:"wristband"}`: diner has a colored band; matching counters glow, the others dim; one new dish greyed "no band" |
| 3 | Order ticket, then the manager signs | Diner writes a ticket; a manager signs it off before anyone cooks | S10, S11 | `food-court` | svg | `{stage:"ticket"}`: ticket moves diner → manager stamp ✓ |
| 4 | Expediter, supplier, and the real words | Pre-agreed dishes go straight to the supplier; others go via the expediter. Name the real terms: procurement BU = kitchen, content zone = wristband, requisition = ticket, approval = sign-off, buyer = expediter, PO = order to supplier | S14, S16 | `food-court` | svg | `{stage:"named"}`: ticket forks: express arrow to supplier truck (label "agreement") vs arrow through expediter; every element gets its real-term label |

- Callouts: step 2, insight: "A dish nobody's wristband covers might as well not exist; that's the #1 'my catalog is missing' cause." Step 4, warning: "The analogy breaks at invoices: there's no food-court version of 2-, 3- or 4-way matching."
- Code / formula: none

### 3.2 Core Mechanism (`core`, kind `stepper`), 8 steps, one scene `ssp-pipeline`

The pipeline has 6 stage boxes left→right: **Shop**, **Cart & Submit**, **Approve**, **Buyer**, **PO**, **Receive & Invoice**. A requisition-line token travels along it. Under each stage, a "lever" chip drops in naming the setup task. After **Buyer** there is a switch: the express track goes straight to PO; the siding goes to "Process Requisitions".

| # | Step title | Narration intent | Cite | Scene id | Mode | What the scene shows (state) |
|---|---|---|---|---|---|---|
| 1 | Before anything: the right BU | Requester needs data access to an active BU with the Requisitioning business function; otherwise POR-2010674. Preferences set the default req BU, deliver-to and charge account | S5, S6 | `ssp-pipeline` | svg | `{active:0, token:"pre", levers:["Requisitioning BU access"]}`: token waits left of Shop at a gate; chip "Manage BU Data Access"; error badge POR-2010674 shown faded |
| 2 | Shop: one search over all content | Purchase Requisitions (New): search or browse local catalogs, punchout, smart forms; content shows only if a content zone covers you | S10, S7, S4 | `ssp-pipeline` | svg | `{active:1, token:"shop", levers:[…,"Content zones"]}`: Shop box lit; three mini tiles (Local, Punchout, Smart form) feed into it through a zone filter |
| 3 | Cart & submit | Add to cart, edit delivery/project/charge details, submit. From 25B you can see approvers and rule names at checkout | S10, S2 | `ssp-pipeline` | svg | `{active:2, token:"cart"}`: Cart box lit; token becomes "REQ" card; small "View approvers" chip |
| 4 | Approve: four stages in a row | Rules from Manage Requisition Approvals (AMX) run Header Preapproval → Header → Header Postapproval → Postapproval FYI | S11, S12 | `ssp-pipeline` | svg | `{active:3, token:"approve", levers:[…,"Manage Requisition Approvals (AMX)"]}`: Approve box shows 4 mini lanes filling in turn |
| 5 | Buyer: a precedence chain | Requester's suggestion → buyer assignment rules → item default buyer → procurement BU default buyer | S13 | `ssp-pipeline` | svg | `{active:4, token:"buyer", levers:[…,"Manage Buyer Assignment Rules"]}`: four stacked chips, the first one that applies lights |
| 6 | The switch: touchless PO | Agreement with "Automatically generate orders" (opt. auto-submit), valid buyer, supplier and site, Negotiated checked for CPA lines → PO with no buyer touch | S14, S15 | `ssp-pipeline` | svg | `{active:5, token:"po", route:"express", levers:[…,"Agreement Controls"]}`: switch thrown to express track; token reaches PO box as "PO" |
| 7 | The siding: Process Requisitions | Any missing condition → line waits for the buyer, who uses the document builder (document type, style, grouping) | S15, S16 | `ssp-pipeline` | svg | `{active:5, token:"siding", route:"siding"}`: switch thrown to siding; token parks at "Process Requisitions" box; checklist with a red ✗ on "Negotiated" |
| 8 | Edge case: invoice on hold | 3-way match needs a receipt; invoice > received gives a QTY REC hold; Redwood flags the line and the requester uses Confirm Receipt (after the Action Required Code job) | S17, S18 | `ssp-pipeline` | svg | `{active:6, token:"hold", levers:[…,"Match approval level"]}`: Receive & Invoice box shows red "QTY REC hold" badge, then a "Confirm Receipt" button chip |

- whatChanged per step (e.g. step 6: "+ PO created", "~ buyer skipped").
- metrics chips: `stage` (name), `touch` ("touchless"/"buyer") from step 6.
- Callouts: step 2, warning: "Creating a catalog does nothing for requesters until it's in a content zone." Step 6, good-to-know: "Pick only 'Automatically generate orders' (not auto-submit) for high-value items, so a buyer reviews the PO." Step 7, insight: "'Approved but no PO' is almost always one of the S15 checklist items, not a stuck approval."
- Code / formula: none

### 3.3 Technical (`technical`, kind `stepper`), 6 steps: the setup map

| # | Step title | Narration intent | Cite | Scene id | Mode | What the scene shows (state) |
|---|---|---|---|---|---|---|
| 1 | Requisitioning BU vs Procurement BU | Req BU raises demand and holds defaults (Configure Requisitioning Business Function); one or more proc BUs serve it; a Default Procurement BU catches lines nothing else claims | S3 | `bu-zones` | svg | `{view:"bu"}`: 2 Req BUs left, 2 Proc BUs right, service arrows; one arrow tagged "Default Procurement BU" |
| 2 | Content zones: usage and security | Zone belongs to a proc BU, has one usage. Requisitioning zones are secured by req BU, by worker, or by deliver-to location; "available to all" is procurement-usage only. Req BU must be a client of the zone's proc BU | S4, S7 | `bu-zones` | svg | `{view:"zones", security:"bu"}`: zone hangs off a Proc BU, fans to Req BUs; three security chips, "BU" active |
| 3 | Approval rules vs task settings | Rules (list builders: Supervisory, Position, Job Level, Single User, User-Defined Routing, Approval Groups) are authored in Manage Requisition Approvals (AMX). Task behavior (aggregation "Once per task", completes on Reject) is in BPM Worklist | S11, S12 | `approval-lanes` | svg | `{mode:"rules"}`: 4 stage lanes; a "Rules (AMX)" panel left and a "Task config (BPM)" panel right with separate labels |
| 4 | Serial vs parallel routing | Serial hierarchy vs Consensus (all approve) vs First Responder Wins (first response decides) | S11 | `approval-lanes` | svg | `{mode:"parallel", vote:"frw"}`: Header lane with 3 approvers; first ✓ completes the stage |
| 5 | Touchless PO checklist | Agreement Business Unit Access for the req BU and supplier site; Controls: Automatically generate orders (+ optional auto-submit); line: valid buyer, supplier/site, purchasable item, Negotiated for CPA; consolidation waits for Generate Orders | S14, S15 | `ssp-pipeline` | svg | `{active:5, route:"checklist"}`: checklist overlay with 7 rows, all green ✓ |
| 6 | Match levels and the Redwood switch | 2-way / 3-way / 4-way (adds inspection). Separately: Redwood SSP is enabled by opt-in ("Redwood as default", or phased with POR_MANAGE_REQ_WITH_PWA_PRIV); first use needs Elastic Search set up | S17, S1, S2 | `match-bars` | svg | `{match:3, po:10, rec:8, inv:10, hold:true}`: three bars, invoice exceeds receipt → hold badge; side chip "Redwood: opt-in + Elastic Search" |

- Callouts: step 3, warning: "Looking for rules in BPM Worklist is a classic dead end; BPM only configures the task." Step 6, good-to-know: "Match approval level is independent of the invoice match option (PO vs receipt) [S17]."
- Code / formula: none. Use a small per-step `code` block (lang `text`, title "Setup task") listing the navigation path / task name on steps 1-5, e.g. `Setup and Maintenance > Manage Requisition Approvals`.

### 3.4 Check Yourself (`check`, kind `quiz`): see §5

### 3.5 Related & Sources (`related`, kind `related`): see §6

## 4. Scenes (all svg, isometric-flat style from the scene kit)

- **`food-court`** · svg
  - Purpose: the whole SSP idea as a food court (ELI5).
  - Elements: 2 kitchen blocks (top), 3 counters with dish tiles, diner figure with a wristband, manager with a stamp, expediter, supplier truck. Colors: allowed counters accent green, blocked counters grey; ticket paper-yellow.
  - State fields: `stage: "kitchen"|"wristband"|"ticket"|"named"`.
  - Transitions: wristband glow and dim counters (2); ticket slides to the manager, stamp appears (3); fork arrows appear and labels swap to real terms (4).
- **`ssp-pipeline`** · svg
  - Purpose: the end-to-end flow with a setup lever under each stage, plus the touchless switch.
  - Elements: 6 stage boxes in a row; a token card; a lever chip row under the boxes; a switch after Buyer with an express track (green) to PO and a siding (amber) to a "Process Requisitions" box; optional checklist overlay; hold badge (red).
  - State fields: `active: 0-6` (lit stage), `token: string` (token label/position), `levers: string[]` (chips visible), `route: "express"|"siding"|"checklist"|undefined`, `hold?: boolean`.
  - Transitions: token slides to the active stage; new lever chip drops in; switch rotates for `route`.
- **`bu-zones`** · svg
  - Purpose: BU relationships and content zone security.
  - Elements: Req BU boxes (blue), Proc BU boxes (purple), service arrows, zone card hanging off a Proc BU, three security chips (BU / Worker / Location).
  - State fields: `view: "bu"|"zones"`, `security: "bu"|"worker"|"location"`.
  - Transitions: the zone card fades in; the fan-out lines narrow from whole BUs to people/locations by security.
- **`approval-lanes`** · svg
  - Purpose: four seeded stages, rules vs task config, serial vs parallel voting.
  - Elements: 4 horizontal lanes (Header Preapproval, Header, Header Postapproval, Postapproval FYI), approver circles, REQ card; side panels "Rules · AMX" and "Task config · BPM".
  - State fields: `mode: "rules"|"parallel"`, `vote: "serial"|"consensus"|"frw"`.
  - Transitions: REQ card advances lane by lane; approver ticks appear per the vote mode.
- **`match-bars`** · svg
  - Purpose: 2/3/4-way match and a quantity-received hold.
  - Elements: bars for PO qty, received qty, invoiced qty (plus an inspected bar if `match:4`), tolerance band, hold badge, "Confirm Receipt" chip.
  - State fields: `match: 2|3|4`, `po, rec, inv: number`, `hold: boolean`.
  - Transitions: bars grow to their values; hold badge pulses when `inv > rec` and `match >= 3`.

## 5. Quiz (7 items; correct positions vary)

| # | Concept | Question | Options (A-D) | Answer | Why (cite) |
|---|---|---|---|---|---|
| 1 | Requester access | A requester gets POR-2010674 when opening Purchase Requisitions (New). What fixes it? | A Assign the Procurement Agent role · B Grant data access to an active BU with the Requisitioning function · C Add them to an approval group · D Rebuild the Elastic Search index | B | Missing requisitioning BU access causes POR-2010674; fix in Manage Business Unit Data Access for Users [S5] |
| 2 | Content zones | A new local catalog is invisible to requesters. Most likely cause? | A It isn't in a content zone that covers them · B It has no default buyer · C Its agreement lacks auto-submit · D The approval rule isn't deployed | A | Content is invisible until associated with a content zone [S7] [S4] |
| 3 | Approval (AMX vs BPM) | Where do you author requisition approval rules? | A BPM Worklist Task Configuration · B Configure Requisitioning Business Function · C Manage Requisition Approvals (AMX) · D Manage Procurement Profile Options | C | Rules live in Manage Requisition Approvals on AMX; BPM holds task settings [S11] [S12] |
| 4 | Approval routing | In a parallel stage set to First Responder Wins, what happens? | A Every approver must approve · B The first response decides the stage · C Approvers act in hierarchy order · D Only FYI notifications go out | B | Consensus = all must approve; First Responder Wins = first response decides [S11] |
| 5 | Buyer assignment | Which source decides the buyer first? | A Buyer assignment rules · B Item's default buyer · C Procurement BU default buyer · D The buyer the requester suggested | D | Requester-suggested buyer wins; then rules, item default, proc BU default [S13] |
| 6 | Requisition to PO | A CPA-sourced approved line has no PO; the agreement has "Automatically generate orders". Likely cause? | A Postapproval FYI hasn't finished · B "Negotiated" isn't checked on the line · C The catalog isn't in a zone · D The match level is 2-way | B | Contract-agreement lines need Negotiated checked for automation [S15] |
| 7 | Receipt and invoice | What does 3-way match require that 2-way doesn't? | A Inspection-accepted quantity · B Supplier acknowledgment · C A receipt within tolerance · D A second approver | C | 3-way adds the receipt; 4-way adds inspection [S17] |

## 6. Related
- Prerequisites:
  - `oracle-fusion-enterprise-structures` · Oracle Fusion Enterprise Structures · BUs and business functions underpin the req/proc BU split.
  - `purchase-agreements` · Purchase Agreements (BPA/CPA) · agreements drive touchless PO creation.
- Next:
  - `process-requisitions` · Process Requisitions and Document Styles · the buyer side of the siding.
  - `amx-approval-rules` · AMX Approval Rule Design · complex routing beyond the seeded stages.
  - `receiving-and-payables-matching` · Receiving and Payables Matching · receipts, holds and tolerances.
  - `redwood-catalog-administration` · Redwood Catalog Administration · content setup on the 26D pages.

## 7. Folder placement
- Parent folder: top level, because no existing topic (Ambani-Vs-Adani, How-Do-Planes-Fly, LLM, Random-Forest, Stacks) is something this is a kind or part of. Its natural parent, "Oracle Fusion Cloud Procurement", doesn't exist yet.
- Adopts: none.

## 8. Sources to cite
- S1 · Enable the Redwood Version as the Default SSP Application (24D) · Redwood vs classic, opt-ins, Elastic Search, classic exceptions
- S2 · Manage FYI Approvers and View Rule Names (25B) · View Approvers at checkout, PWA privilege
- S3 · Configure BUs with Requisitioning Business Functions · req BU defaults, default proc BU, cancel unfulfilled demand
- S4 · Content Zone Security Options · usage, security by BU/worker/location
- S5 · Assign a User to a BU That Supports Requisitioning · POR-2010674 fix
- S6 · Set Preferences to Enable Requisition Creation · preferences
- S7 · How You Create Content Zones · content types, visibility
- S8 · Smart Forms · noncatalog requests, CPA auto-PO
- S9 · Punchout Catalogs · punchout models, contract number in cart
- S10 · Create a Requisition · shopping flow
- S11 · Setting Up Requisition Approval Task · stages, list builders, routing
- S12 · Approval Rules Management for Procurement · AMX vs BPM
- S13 · Buyer Assignment Rules · buyer precedence
- S14 · Supplier Agreement Order Automation Controls · agreement flags
- S15 · Why my requisition wasn't converted to a PO · automation checklist
- S16 · Create Procurement Documents from Requisitions · document builder
- S17 · Match Approval Level Options · 2/3/4-way
- S18 · Resolve Requisition Lines with Invoice Holds · Confirm Receipt
- S19 · SSP 26A Feature Summary · recent features (Related tab note)
- S20 · Redwood Catalog Administration (26D) · catalog admin landing page
