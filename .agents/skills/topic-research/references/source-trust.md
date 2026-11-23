# Source trust, by domain

Rank sources in this order and record the tier in `sources.json` (`trust`). When a lower tier says something a higher tier doesn't, say so in "Gaps and conflicts".

| Tier | Meaning |
|---|---|
| `primary` | The origin of the fact: the standard, the official docs, the paper, the agency, the author |
| `institutional` | Universities, national labs, museums, professional bodies explaining their own field |
| `reference` | Encyclopedias and well-edited references (Wikipedia is fine for dates and overviews; follow its citations for anything contested) |
| `secondary` | Reputable explainers: established publications, well-known educators |

Avoid: content farms, SEO listicles, AI-generated pages, forums for facts (fine for misconceptions people hold), anything with no author or date.

## By domain

| Domain | Prefer | Use carefully |
|---|---|---|
| **DSA / algorithms** | Language docs (Python, Java, C++ reference), CLRS / Sedgewick course pages, university lecture notes (MIT OCW, Princeton) | LeetCode/GfG articles: fine for problem framings, check every complexity claim |
| **AI / ML** | Original papers (arXiv + venue version), official library docs (PyTorch, scikit-learn), lab blogs from the authors, university course notes (Stanford CS231n/CS224n) | Medium/Towards Data Science: only for intuition, never as the source of a number |
| **Science / engineering** | NASA, NIST, NIH, NOAA, CERN, national academies, university physics/chem departments, peer-reviewed reviews | Popular-science sites: often repeat myths (e.g. equal-transit lift) |
| **Tech / networking** | RFCs and IETF docs, W3C/WHATWG specs, MDN, vendor docs (Cloudflare, AWS) for how real systems behave | Vendor marketing pages |
| **History** | Academic historians, university presses, national archives and museums, Britannica, peer-reviewed journals | Wikipedia for dates/overview (follow its citations); avoid single-author blogs for contested claims |
| **Film / arts** | Interviews with the makers, published screenplays and books, film scholarship (journals, BFI, Criterion essays), trade press (Variety, Hollywood Reporter) for facts | Fan wikis and video essays: OK for ideas, verify facts elsewhere |
| **Health** | WHO, CDC, NHS, NIH, Cochrane reviews | News coverage of single studies |

## Rules

- Open every source you cite. Record the final URL after redirects.
- Copy numbers, dates and quotes exactly; paraphrase everything else.
- For facts that change (versions, prices, records, laws), use the newest primary source and note the date.
- Two independent sources for anything surprising.
