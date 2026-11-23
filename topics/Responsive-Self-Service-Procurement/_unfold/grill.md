# Grill: Responsive Self Service Procurement in Oracle Fusion

- Date: 2026-11-23 · Questions: 6 · Pitch level: **Beginner**

Note: the probe self-rating was "use it, want depth", but every question, including recall level, came back "I'm not sure". The pitch follows the evidence: start from the foundations and build up to practitioner setup detail.

## Concepts
| Concept | Tag | Evidence |
|---|---|---|
| Requisitioning BU and Procurement BU | unknown | Q5 not sure (recall) |
| Requester access | unknown | not reached; inherits from the unknown concept before it |
| Responsive (Redwood) vs classic SSP | unknown | not reached; inherits unknown |
| Shopping content (catalogs, punchout, smart forms) | unknown | Q4 not sure (apply) |
| Content zones | unknown | Q4 not sure (apply) |
| Requisition creation | unknown | not reached; inherits unknown |
| Requisition approval (AMX/BPM) | unknown | Q3 not sure (recall) |
| Buyer assignment | unknown | not reached; inherits unknown |
| Requisition to PO | unknown | Q1 not sure (predict), Q2 not sure (recall) |
| Receipt and invoice | unknown | Q6 explain-it: not sure |
| Current changes 24D to 26D | unknown | not reached; inherits unknown |

## Misconceptions detected
- None revealed (no wrong answers, only "not sure"). Treat every misconception in research.md as a live risk.

## Explain-it answer
> not sure
Verdict: no. There's no model yet of the shop → requisition → approval → PO → receipt → invoice chain.

## Log
1. [predict] CPA-sourced approved line, no PO: why? → not sure
2. [recall] What happens to an approved line that isn't touchless? → not sure
3. [recall] Where are approval rules authored? → not sure
4. [apply] New catalog not visible to requesters: why? → not sure
5. [recall] Requisitioning BU vs Procurement BU? → not sure
6. [explain] One sentence: how a requisition becomes something a supplier is paid for → not sure

## Implications for the lesson
- Dwell on: the end-to-end pipeline as a mental model first (Shop → Requisition → Approve → Buyer/PO → Receipt → Invoice), then the BU split, content zones vs catalogs, and touchless vs buyer-processed PO.
- Move fast through: release history (24D to 26D) and Redwood opt-in mechanics. Keep them short and practical.
- Quiz should target: BU split, content zone visibility, AMX vs BPM, the touchless PO conditions (Negotiated, Auto-generate orders), buyer precedence, and the Process Requisitions fallback.
- Because the learner uses it at work, every concept should end with "where you'd set this up" (the setup task name), so the lesson works as a practical reference.
