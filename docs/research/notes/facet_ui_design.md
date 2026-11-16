# Faceted navigation and label/filter UI design for a small private provider directory

Scope: browse-and-filter UI for a private "yellow pages" of providers (wedding vendors first), 1-10 users,
desktop and phone, a few hundred to a few thousand entries, labels organized as facets plus full-text search.

Source status legend (applies throughout):
- [PR] peer-reviewed.
- [SCH] scholarly but not a peer-reviewed article (university-press book, workshop position paper, edited encyclopedia).
- [PRAC] practitioner research or opinion (Nielsen Norman Group, Baymard Institute). Baymard benchmarks
  e-commerce sites with large catalogs; transferability to a few-thousand-item private directory is flagged per finding.
- [STD] standards body / authoring guidance (W3C WAI-ARIA Authoring Practices).
- [VEND] vendor documentation (Algolia); used only where it states a UI practice or a default.

Sources actually read for these notes:
- Hearst, "Search User Interfaces", Cambridge University Press 2009, ch. 8 "Integrating Navigation with Search" [SCH] -
  https://www.searchuserinterfaces.com/book/sui_ch8_navigation_and_search.html
- Hearst, "UIs for Faceted Navigation: Recent Advances and Remaining Open Problems" (HCIR 2008 workshop, per file name; venue not printed on the PDF) [SCH, workshop paper] -
  https://flamenco.ischool.berkeley.edu/papers/hcir08.pdf (read in full, 4 pages)
- NN/g: Whitenton 2014 "Filters vs. Facets" [PRAC] - https://www.nngroup.com/articles/filters-vs-facets/
- NN/g: Whitenton 2015 "Mobile Faceted Search with a Tray" [PRAC] - https://www.nngroup.com/articles/mobile-faceted-search/
- NN/g: Sherwin 2016 "User Intent Affects Filter Design" [PRAC] - https://www.nngroup.com/articles/applying-filters/
- Baymard: Olah 2024 "Always Allow Users to Combine Multiple Filtering Values of the Same Type" [PRAC] - https://baymard.com/blog/allow-applying-of-multiple-filter-values
- Baymard: Reeves 2020, updated 2026 "Display 'Applied Filters' in an Overview" [PRAC] - https://baymard.com/blog/how-to-design-applied-filters
- Baymard: Holst 2014 "6 Guidelines for Truncation Design" [PRAC] - https://baymard.com/blog/truncation-design
- Baymard: MacDonald 2026 "What Is an Ecommerce Filter? UI Best Practices" [PRAC] - https://baymard.com/blog/ecommerce-filter-ui
- W3C WAI-ARIA APG Tree View pattern [STD] - https://www.w3.org/WAI/ARIA/apg/patterns/treeview/
- W3C WAI-ARIA APG Checkbox pattern [STD] - https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/
- Algolia InstantSearch.js refinementList reference [VEND] - https://www.algolia.com/doc/api-reference/widgets/refinement-list/js/
- Algolia routing/URL guide [VEND] - https://www.algolia.com/doc/guides/building-search-ui/going-further/routing-urls/js/
- ISKO Encyclopedia of Knowledge Organization, "Tagging" [SCH, edited review article; secondary] - https://isko.org/cyclo/tagging

Not obtained: Hearst's SIGIR 2006 workshop paper "Design recommendations for hierarchical faceted search interfaces"
(no copy found on Hearst's sites in search); Tunkelang "Faceted Search" (2009, Morgan & Claypool, not freely
available - not consulted, no paywall bypass attempted); Yee et al. CHI 2003 [PR] was not read directly, only as
summarized in Hearst's book.

---

## 1. How many facets and values per facet; hierarchy depth; long value lists

### Takeaway
No source gives a hard numeric limit. Practitioner guidance converges on: show roughly 4-10 facets prominently, collapse
the rest; show about 6-10 values per facet before a "show more" link; add search-within-facet for long, flat lists
(e.g. names). For hierarchies, Hearst's guidance is "not too wide nor too deep" and to show one level below the current
selection plus a trail of ancestors.

### Cited Findings
- Facets "should not be too wide nor too deep," with exceptions for inherently long lists such as author names (sec. 8.6.1); the book gives no numeric facet count. [SCH] - [Hearst SUI ch. 8](https://www.searchuserinterfaces.com/book/sui_ch8_navigation_and_search.html)
- Facets must match users' mental models, otherwise "the interface will suffer some of the same problems as directory structures" (sec. 8.6.1). [SCH] - [Hearst SUI ch. 8](https://www.searchuserinterfaces.com/book/sui_ch8_navigation_and_search.html)
- "Faceted navigation generally works best if the facets are conceptually orthogonal and the item assignment is responsible for mixing and matching them." (sec. 3) [SCH] - [Hearst HCIR 2008](https://flamenco.ischool.berkeley.edu/papers/hcir08.pdf)
- eBay Express placed "a small number of facets (four or five)" in the interface "sweet spot" across the top, "showing only a few labels per facet, and a More... link to see the rest"; which facets to expose per product type was determined in advance "largely through query logs and click logs", with remaining facets in a compressed list. (sec. 4.2) [SCH, describes a commercial design, no usability data] - [Hearst HCIR 2008](https://flamenco.ischool.berkeley.edu/papers/hcir08.pdf)
- Flamenco displayed the level directly below the current selection plus a trail of higher-level labels; hovering showed children in a tooltip so three levels were visible at once (sec. 8.6.1). [SCH] - [Hearst SUI ch. 8](https://www.searchuserinterfaces.com/book/sui_ch8_navigation_and_search.html)
- Baymard: there is no single "too many filters" number; prioritize "the 5-10 attributes most relevant to that category, and collapse or hide the rest"; "20+ filter categories at once" is overwhelming; collapse less important groups by default and keep key ones open. [PRAC, e-commerce] - [Baymard 2026, ecommerce-filter-ui](https://baymard.com/blog/ecommerce-filter-ui)
- Baymard truncation guideline: show at least 6 values before truncating; up to 10 performs decently; 15+ causes issues; never truncate when only one value would be hidden (truncate only when 2+ would be hidden); style the "more" link as a normal site link, place it close to its own facet, add a plus/arrow indicator, optionally fade the last visible value. [PRAC, 2014, e-commerce] - [Baymard, truncation design](https://baymard.com/blog/truncation-design)
- Search within a facet: Hearst describes "separate autocomplete entry forms for each facet", "especially useful for facets with very large numbers of labels that cannot be organized into a hierarchy" such as author names; she notes few if any usability studies and bases her positive judgement on "observation and anecdote". (sec. 4.1) [SCH, explicitly anecdotal] - [Hearst HCIR 2008](https://flamenco.ischool.berkeley.edu/papers/hcir08.pdf)
- Baymard cites Lowe's mobile filter letting users "search within filter types such as 'Brand'" as helpful for long lists. [PRAC] - [Baymard 2026](https://baymard.com/blog/ecommerce-filter-ui)
- Algolia's refinement list defaults: `limit` 10 values shown, `showMore` off by default, `searchable` (search for facet values) off by default; default value order `['isRefined','count:desc','name:asc']` (selected values first, then by count, then alphabetical). [VEND] - [Algolia refinementList](https://www.algolia.com/doc/api-reference/widgets/refinement-list/js/)
- Faceted navigation is "significantly more expensive to create and maintain" than simple filters and adds interaction cost; confirm users "truly do need faceted navigation." [PRAC] - [NN/g Filters vs. Facets](https://www.nngroup.com/articles/filters-vs-facets/)

### Inferences
- For this directory: 3-5 facets (Category, Area, Source, maybe Price band / Status) are well inside every cited range; the 5-10 / 20+ thresholds are e-commerce numbers but the direction (few facets visible, rest collapsed) transfers.
- Show ~8 values per facet, sorted selected-first then by count (Algolia default), with "Show N more"; add a per-facet search box once a facet exceeds roughly 15-20 values (Area and Source are the likely candidates).
- Category hierarchy: Category > Wedding > Photo is 3 levels. Hearst's display rule (children of the current node + ancestor trail) keeps any depth manageable, but users creating labels should be steered to 2-3 levels; deeper trees were not studied in the sources read.
- Keep facets orthogonal (Hearst): "Source" (where the provider was found) and "Category" (what they sell) are orthogonal; avoid a facet that mixes concepts (Hearst's critique of Getty's "Keywords" grab-bag).

### Gaps
- No source read gives an evidence-based maximum hierarchy depth or maximum number of facets; numbers above are practitioner heuristics.
- Hearst's SIGIR 2006 workshop paper and Tunkelang's book were not obtained.

---

## 2. Selection semantics: OR within a facet, AND across facets; single vs multi-select; hierarchical values

### Takeaway
OR within a facet and AND across facets is the established convention (Baymard calls it "well-established"; Algolia's
default operator is OR; Hearst's model is a "conjunct of disjuncts"). Selecting a parent in a hierarchy includes all
descendants. Default to multi-select checkboxes; Baymard found single-select filters made users less likely to use
filters effectively.

### Cited Findings
- "selecting a label within a facet hierarchy is equivalent to querying on a disjunction over all the labels beneath the selected one. When labels from different parts of the hierarchy are selected, the system in effect builds a conjunct of disjuncts over the selected labels and their subcategories." (sec. 2) [SCH] - [Hearst HCIR 2008](https://flamenco.ischool.berkeley.edu/papers/hcir08.pdf)
- Flamenco's query is "a conjunction of different categories at different levels of hierarchy" (sec. 8.6.1). [SCH] - [Hearst SUI ch. 8](https://www.searchuserinterfaces.com/book/sui_ch8_navigation_and_search.html)
- Baymard: across filter types results match all (AND); within a type results match any (OR); described as "well-established e-commerce conventions". 15% of benchmarked sites do not allow multiple values per filter type. Participants sometimes applied 5-6 filters, some up to 10; participants were "far less likely" to use filters effectively when options were mutually exclusive (qualitative). Use checkboxes so multi-select is evident. [PRAC, e-commerce] - [Baymard 2024](https://baymard.com/blog/allow-applying-of-multiple-filter-values)
- Baymard 2026 repeats: AND between filter types, OR within; use checkboxes not radio buttons. [PRAC] - [Baymard 2026](https://baymard.com/blog/ecommerce-filter-ui)
- Algolia refinementList `operator` default is `or`; `and` available. [VEND] - [Algolia refinementList](https://www.algolia.com/doc/api-reference/widgets/refinement-list/js/)
- Yelp (2008) signalled multi-select facets with checkboxes and single-select facets with hyperlinks (e.g. Distance); its design did not show hit counts because showing previews "is potentially confusing ... when disjunctions are allowed; this is a tradeoff". (sec. 4.2) [SCH, describes a commercial design] - [Hearst HCIR 2008](https://flamenco.ischool.berkeley.edu/papers/hcir08.pdf)
- eBay Express: "More..." opened a dialog with checkboxes "allowing the user to create an OR (disjunction) over the choices within one facet." [SCH] - [Hearst HCIR 2008](https://flamenco.ischool.berkeley.edu/papers/hcir08.pdf)
- Mixed (tri-state) checkbox: `aria-checked="mixed"` represents a partially checked parent; APG's mixed-state example uses it to "reflect and control" a group of two-state checkboxes. [STD] - [WAI-ARIA APG Checkbox](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/)

### Inferences
- For this directory: OR within each facet, AND across facets, multi-select everywhere; single-select only for genuinely exclusive facets (none is evident in the example schema).
- Hierarchy: checking "Wedding" matches every provider labelled Wedding or any descendant (Photo, Video, ...). If some but not all children are checked, show the parent as mixed (APG tri-state), not as checked.
- A provider carrying two values in one facet (e.g. both Photo and Video) matches either selection under OR, which is the expected behavior; AND within a facet ("must do both photo and video") is a rarer need and could be an advanced toggle (Algolia exposes it as `operator: 'and'`).

### Gaps
- No peer-reviewed study read directly compares OR vs AND within a facet; evidence is practitioner (Baymard) plus Hearst's model description.
- Whether clicking a parent should auto-check its children visually, or just match them, was not specified in any source read.

---

## 3. Result counts, zero-count values, dead ends, active filters, clearing, URL state

### Takeaway
Show a count next to each value (Baymard: among the highest-impact filter improvements; Hearst: "query previews"). Prevent
empty results or offer a recovery path. Show active filters as removable chips with per-chip remove, "Clear all", and
facet name where ambiguous; never just a count. Keep the filter state in the URL for sharing, bookmarking and Back.

### Cited Findings
- One of the goals of faceted navigation is to "prevent empty result sets"; others: suggest navigation choices at each step, seamless integration with keyword search, fluid switching between refining and expanding, "a feeling of control and understanding without confusion". (sec. 2) [SCH] - [Hearst HCIR 2008](https://flamenco.ischool.berkeley.edu/papers/hcir08.pdf)
- Parametric search can produce empty sets with no guidance on which constraint to drop; faceted navigation with counts (query previews) largely replaced it (sec. 8.6). [SCH] - [Hearst SUI ch. 8](https://www.searchuserinterfaces.com/book/sui_ch8_navigation_and_search.html)
- Baymard: show counts, e.g. "Blue (34)", "one of the single highest-impact improvements you can make to a filter UI"; zero-result combinations are a dead end to be handled "either by preventing the selection or by offering a clear recovery path" (example message: "No results for these filters. Try removing X."). The page does not say whether to hide or disable zero-count values. [PRAC] - [Baymard 2026](https://baymard.com/blog/ecommerce-filter-ui)
- NN/g: interactive facets "show the number of elements available under each filter", helping avoid zero results; batch filtering carries "a risk that users will select a combination of criteria that leads to zero results". [PRAC] - [NN/g 2016](https://www.nngroup.com/articles/applying-filters/)
- Flamenco breadcrumbs: keep each facet's path in its own visual component rather than one mixed trail; users can remove a whole facet or move up a level by clicking a parent term (sec. 8.6.1). [SCH] - [Hearst SUI ch. 8](https://www.searchuserinterfaces.com/book/sui_ch8_navigation_and_search.html)
- Baymard applied filters: 28% of benchmarked sites show no applied-filters overview; desktop placement above list, above sidebar or below a toolbar all work if "easy to see"; per-filter "x" plus "Clear All"; include the facet name when the value is ambiguous ("Width: 90cm"), and style it as secondary text; a count-only summary such as "Filter (3)" "performed poorly". Mobile overflow: horizontal scroll with half or more of the cut-off chip visible, faded edge, and a count; or 1-2 rows plus "See All Applied Filters". [PRAC, e-commerce] - [Baymard applied filters](https://baymard.com/blog/how-to-design-applied-filters)
- Baymard 2026: "always surface active filter chips in the main results view"; reset with "Clear All" plus per-group resets; keep filter state in URL query parameters so it persists on Back. [PRAC] - [Baymard 2026](https://baymard.com/blog/ecommerce-filter-ui)
- Algolia: syncing search state to the URL is "considered good practice", "so users can bookmark, share, and revisit a search", and enables back/forward; shorten URLs by renaming parameters and mapping long category names to short readable slugs. [VEND] - [Algolia routing](https://www.algolia.com/doc/guides/building-search-ui/going-further/routing-urls/js/)

### Inferences
- With OR-within-facet, the count shown next to an unselected value in the same facet should answer "how many would I get if I added this" (i.e. computed ignoring that facet's own selection, "disjunctive faceting"). Hearst notes counts with disjunctions can confuse; label the count semantics consistently. (No source read defines the computation; see Gaps.)
- Zero-count values: Baymard's "prevent the selection" wording points to disabling (greyed, not clickable) rather than hiding; for a small directory, hiding zero-count values in long facets and greying them in short ones keeps the layout stable. This is an inference, not a cited rule.
- With 1-10 users sharing views ("here are the Bucharest photographers from Fest 2026"), URL state is the main share mechanism; use readable label slugs (Algolia's advice) and ensure renamed/merged labels still resolve (redirect old slug to new).

### Gaps
- No source read states explicitly whether to hide or disable zero-count values.
- No source read defines how counts should be computed under OR semantics (disjunctive faceting); Algolia documents this elsewhere but that page was not read.

---

## 4. Facets on mobile: drawer vs inline; apply-on-tap vs apply button

### Takeaway
Use an overlay panel (tray, bottom sheet or full-screen sheet) opened by a labelled "Filter" button, keep the result
count always visible, and show applied filters as chips above results. Instant vs batch is contested: NN/g 2015 favors
instant updates behind a tray, NN/g 2016 and Baymard 2026 recommend an explicit apply button on mobile with a live
"Show N results" count. The main argument for batch (slow networks, jarring reloads) is weaker when results are local
and instant.

### Cited Findings
- NN/g 2015: facet panel overlaid on the results (right side, dimmed background), not a separate page, because a separate page "forces users to work harder to understand how the facet controls affect the results set"; total result count "always visible"; ideally results update "as soon as the user selects a filter criteria"; label the trigger with words ("Filter", "Refine") rather than icons. [PRAC, 2015] - [NN/g mobile tray](https://www.nngroup.com/articles/mobile-faceted-search/)
- NN/g 2016: interactive filtering suits exploratory users, batch suits users with criteria in mind; rule of thumb leans toward batch with Apply; "on mobile devices, we recommend batch filtering" because page loads are often slow; interactive is less disruptive when results appear in under one second. [PRAC, 2016] - [NN/g 2016](https://www.nngroup.com/articles/applying-filters/)
- Baymard 2026: full-screen overlay or bottom sheet behind a clearly labelled, sticky trigger; prominent "Show X Results" button with a live count; apply only on explicit action on mobile (real-time updates cause "jarring refreshes"); real-time filtering "is the expected standard for desktop"; tap targets at least 44x44 pt. [PRAC] - [Baymard 2026](https://baymard.com/blog/ecommerce-filter-ui)
- Baymard: without an applied-filters overview, mobile users must reopen the filter panel for each removal. [PRAC] - [Baymard applied filters](https://baymard.com/blog/how-to-design-applied-filters)
- Baymard: multi-select matters more on mobile because each filter round trip costs a panel open/close. [PRAC] - [Baymard 2024](https://baymard.com/blog/allow-applying-of-multiple-filter-values) 

### Inferences
- For this directory (client-side filtering over a few thousand entries is effectively instant): desktop - inline sidebar with instant updates; phone - bottom sheet or full-screen sheet with checkboxes that update a live count on a "Show N providers" button, plus removable chips above results. This reconciles NN/g 2015 (see effect immediately via count) and Baymard/NN/g 2016 (no layout jumps behind the sheet).
- The user's own rules call for showing UI options side by side before building; the sheet-with-apply and instant-tray variants are the two to prototype.

### Gaps
- No controlled study comparing apply-button vs instant filtering on mobile was found; all three sources are practitioner judgment, and they disagree.

---

## 5. Combining keyword search with facets

### Takeaway
Keyword search should run within the current faceted result set and the facets should update to describe the search
results (Flamenco). Mapping typed words to facet values (eBay Express "women's rebocks" -> Type and Brand selected) helps
when it works but can misfire. Autocomplete within individual facets is recommended for long value lists.

### Cited Findings
- Flamenco: keyword search runs over the metadata and text of the current result set, and results remain grouped by facet (sec. 8.6.1). [SCH] - [Hearst SUI ch. 8](https://www.searchuserinterfaces.com/book/sui_ch8_navigation_and_search.html)
- In Flamenco-style navigation "the items that match the query determine which facet labels are shown" (aggregation of labels of retrieved items). [SCH] - [Hearst HCIR 2008](https://flamenco.ischool.berkeley.edu/papers/hcir08.pdf)
- eBay Express mapped queries to facet values ("women's rebocks" -> Type > women's, Brand > Rebock in the breadcrumb): "terrific when it works, but of course, in many cases the mapping might not be correct." (sec. 4.2) [SCH] - [Hearst HCIR 2008](https://flamenco.ischool.berkeley.edu/papers/hcir08.pdf); also sec. 8.6.2 "Ella Fitzgerald" -> Artist label - [Hearst SUI ch. 8](https://www.searchuserinterfaces.com/book/sui_ch8_navigation_and_search.html)
- Yelp reordered values within facets to match the query (e.g. "italian restaurants" brings Italian, Pizza to the top of Category) and hid facets not applicable to the chosen category, with imperfect results. [SCH] - [Hearst HCIR 2008](https://flamenco.ischool.berkeley.edu/papers/hcir08.pdf)
- Flamenco usability study (Yee et al. 2003, as summarized by Hearst): 32 art history students, ~35,000 items, vs a Google-Images-style baseline; participants significantly favored the faceted interface on ease of use, browsing, flexibility; "91% said they preferred Flamenco to the baseline overall"; for a single-facet task about half preferred the baseline; presentation order strongly affected ratings. [PR study, read via SCH secondary summary] - [Hearst SUI ch. 8](https://www.searchuserinterfaces.com/book/sui_ch8_navigation_and_search.html)

### Inferences
- For this directory: one search box that filters the current faceted set (AND with facets), facet counts recomputed on the search results; match the query against provider name, notes and label names, and offer "Add label 'Photo' as a filter" when the query equals a label, rather than silently converting it (avoids eBay's mis-mapping risk).
- The Yee et al. sample (35,000 items) is larger than this directory but much closer in scale than Baymard's catalogs, so its preference result is reasonably transferable.

### Gaps
- Yee et al. 2003 was not read directly; numbers come from Hearst's book.

---

## 6. User-defined facet schema: creation, editing, and pitfalls of user-defined taxonomies

### Takeaway
Uncontrolled labels suffer synonymy (most damaging), polysemy, spelling and singular/plural variants, basic-level
variation (broad vs narrow terms used interchangeably) and idiosyncratic one-off labels. Mitigations in the literature:
suggest existing labels while typing, periodic "tag gardening" (seed, weed, merge), mapping to a controlled vocabulary,
and hybrid folksonomy-plus-facets. Hearst sees tags as raw material for building better facet structures.

### Cited Findings
- Golder and Huberman (Journal of Information Science 2006; arXiv preprint 2005) analyze Delicious tagging; polysemy hurts precision and synonymy is described as the bigger problem because one concept is spread across several tags. [PR; known via search snippets, full text not read] - [arXiv cs/0508082](https://arxiv.org/pdf/cs/0508082)
- Problems catalogued in the tagging literature: lack of synonym and homonym control (Kroski 2005; Mathes 2004); variants such as "man, men, male, human" (Noruzi 2007); singular/plural choice (Noruzi 2007); "over-personalisation" (Guy and Tonkin 2006); "different basic levels" (Peters and Stock 2007); imprecision and weak precision. [SCH secondary review] - [ISKO Encyclopedia, Tagging](https://isko.org/cyclo/tagging)
- Mitigations catalogued: tag recommendation that encourages "consolidation of tagging vocabulary" (Ding et al. 2010); suggesting "most popular tags" increased relevance and precision (Jaeschke et al. 2007); "seeding, weeding and fertilizing" the tag garden (Weller and Peters 2008); "tidying tags, or tag bundles" (Guy and Tonkin 2006); thesauri / controlled vocabulary (Noruzi 2007); FaceTag hybrid combining flat tags with faceted vocabulary (Ding et al. 2010); tag clouds alone "not sufficient for navigation" (Sinclair and Cardew-Hall 2008). [SCH secondary review; primary studies not read] - [ISKO Encyclopedia, Tagging](https://isko.org/cyclo/tagging)
- Hearst: "tags can provide an excellent basis for the formation of better organized faceted navigation structures"; acquisition of faceted metadata is an open problem and "social tagging shows promise". [SCH, opinion] - [Hearst HCIR 2008](https://flamenco.ischool.berkeley.edu/papers/hcir08.pdf)
- Facets work best when conceptually orthogonal; mixing concepts in one facet (Getty's "Keywords") produced "a hodge-podge". [SCH] - [Hearst HCIR 2008](https://flamenco.ischool.berkeley.edu/papers/hcir08.pdf)
- Baymard: poor categorization causes filtering problems even when multi-select is allowed - fix the catalog first. [PRAC] - [Baymard 2024](https://baymard.com/blog/allow-applying-of-multiple-filter-values)

### Inferences
- Schema model for this app: facets are a small fixed-ish set edited in a settings view (create, rename, reorder, mark single/multi-select); values are created inline while labelling a provider, but the input autocompletes existing values (case- and diacritic-insensitive, e.g. "Bucuresti" vs "Bucharest") and asks before creating a new one.
- Provide label-maintenance tools: rename (propagates to all providers, keeps URL alias), merge A into B (synonyms, plural variants), move value to another parent or facet, delete-with-reassign, and a "labels used once" / "unused labels" list for weeding (Weller and Peters' gardening).
- Optional synonyms/aliases on a value (e.g. "Foto" -> Photo) used by search, so a merge is not the only cure for synonymy.
- With 1-10 users, a single owner role for schema edits plus free value creation for everyone keeps sprawl low; this is an inference, no source studies small private teams.

### Gaps
- No source found that studies user-defined facet schemas in small private tools; evidence is from large public tagging systems (Delicious, library catalogs). Transfer is plausible for synonymy/variant problems, less so for spam and scale effects.
- Golder and Huberman full text and the primary mitigation studies were not read directly.

---

## 7. Accessibility of facet controls

### Takeaway
Use native checkboxes grouped under a labelled group for each facet; tri-state (aria-checked="mixed") for partially
selected parents; the WAI-ARIA tree pattern applies only if values are presented as an expandable tree, with
aria-checked for multi-select, aria-expanded on parents only, and full arrow-key support.

### Cited Findings
- Checkbox pattern: checkbox groups with a visible label belong in an element with `role="group"` and `aria-labelledby`; Space toggles; tri-state checkboxes use `aria-checked="mixed"` when partially checked; APG's mixed-state example uses native HTML checkboxes inside a fieldset. The page does not state a preference for native vs ARIA checkboxes. [STD] - [APG Checkbox](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/)
- Tree view: roles `tree`, `treeitem`, `group`; `aria-multiselectable="true"` for multi-select; use either `aria-selected` or `aria-checked`, not both, with `aria-checked` recommended for multi-select; `aria-expanded` on parent nodes only (end nodes omit it or are announced as parents); Up/Down move between visible nodes, Right/Left expand/collapse and move parent/child, Home/End, Space toggles selection in the recommended multi-select model; type-ahead recommended, especially with more than seven root nodes; selection-follows-focus "can severely degrade accessibility" in some cases; provide separate Select All / Unselect All controls where bulk selection matters; tree needs an accessible name. [STD] - [APG Tree View](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/)
- Mobile tap targets at least 44x44 pt (Apple guideline, cited by Baymard). [PRAC] - [Baymard 2026](https://baymard.com/blog/ecommerce-filter-ui)

### Inferences
- For a 2-3 level Category facet, nested `fieldset`/`legend` with native checkboxes and disclosure buttons (button with aria-expanded) per parent is simpler and more robust than a full ARIA tree; reserve the tree pattern for deep hierarchies. The APG Disclosure pattern (https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) is the relevant reference for collapsible facet sections but was not read for these notes.
- Announce result-count changes (live region) when filters change; this is common practice but not cited from a source read here.

### Gaps
- APG Disclosure pattern and WCAG success criteria for live regions/target size were not fetched.
- No source compared screen-reader usability of tree-based vs nested-checkbox facets.
