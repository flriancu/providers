# Facets with shareable labels fit the directory

**Bottom line.** For a private directory of a few hundred to a few thousand providers, the evidence favors **a few typed facets (one shallow "Category" tree plus flat facets such as Area, Source, Status) over both free flat tags and one deep nested tree**. In lab studies, faceted navigation found far more matching items on multi-attribute tasks and was preferred by 29 of 32 participants, but it gave no advantage on single-attribute lookups and was slower ([Yee et al. 2003, PR](https://flamenco.berkeley.edu/papers/flamenco-chi03.pdf)). Personal information management studies show people keep one home per item, rarely use more than one tag, and re-find mostly by browsing a remembered place ([Bergman et al. 2013, PR, abstract only](https://ideas.repec.org/a/bla/jamist/v64y2013i10p1995-2012.html); [Teevan et al. 2004, PR](https://people.csail.mit.edu/teevan/work/publications/papers/chi04.pdf)). That argues for one primary Category per provider plus structured facets, and against free tags as the main organizer. No product read for this report shares access by tag. Google Maps shares by list, Notion by page, Airtable by view and Drive by folder, and all of them resolve overlapping grants as a union. Every label can therefore be the sharing unit, provided the app shows which labels are shared and warns when applying one widens access. Four options are compared at the end. **Option C (faceted labels, any label shareable, union access) is recommended**, and Option D is the fallback if audit clarity matters more than convenience.

Source key used throughout:

- **[PR]**: peer-reviewed (journal, ACM CHI/JCDL/SIGIR/CSCW, ASIS&T, HFES, USENIX ATC).
- **[non-PR]**: practitioner research (Nielsen Norman Group, Baymard), scholarly book or workshop paper, vendor or official documentation.
- **"abstract only"**: only the abstract or an indexer record was read.
- **"via secondary"**: the finding comes from another author's summary; the original was not read.
- **Inference**: a conclusion drawn from the sources, not stated by them.

## Faceted navigation wins on multi-attribute questions, not on lookups

| Finding | Source | Status |
|---|---|---|
| "Find all US woodcuts": 77% of facet users found all items vs 21% with keyword baseline; aquatints 81% vs 57% | [Yee et al., CHI 2003](https://doi.org/10.1145/642611.642681) ([PDF](https://flamenco.berkeley.edu/papers/flamenco-chi03.pdf)) | [PR], full text |
| Dead-end (empty) screens: 26 with facets vs 82 baseline; 29 of 32 preferred facets overall; 28 of 32 said the baseline was "more likely to dead-end" | same | [PR], full text |
| Single-facet task ("images of roses"): preference split 16 vs 15; facet interface was slower (12 min 6 s vs 9 min 30 s on one task, partly system latency) | same | [PR], full text |
| Users combined several facets in 19% of open and 45% of structured queries | same | [PR], full text |
| Users preferred dynamically organized faceted metadata to standard site search; used facets to refine more than "search within" (27.6% vs 9%); 7% broadened by removing a facet | [English et al., CHI 2002 EA](https://doi.org/10.1145/506443.506517) | [PR] short paper; numbers via secondary ([Fagan 2010](https://doi.org/10.6017/ital.v29i2.3144)) |
| Users preferred a familiar hierarchy plus search, yet named facets the best feature of the test designs: "If there is a predominant model of the information space, a well designed hierarchical organization might be preferred" | [Capra et al., JCDL 2007](https://doi.org/10.1145/1255175.1255267) | [PR], via secondary ([Fagan 2010](https://doi.org/10.6017/ital.v29i2.3144)) |
| Categorized overviews made 24 searchers explore deeper and feel more organized, with no measured gain in output quality | [Kules and Shneiderman, IP&M 2008](https://doi.org/10.1016/j.ipm.2007.07.014) | [PR], abstract only |
| Eye tracking: about 50 s on results, 25 s on facets, 6 s on query box per task | [Kules et al., JCDL 2009](https://doi.org/10.1145/1555400.1555452) | [PR], abstract and secondary |
| Users find automatic clusters hard to interpret; prefer predictable categories | [Hearst, CACM 2006](https://flamenco.ischool.berkeley.edu/papers/cacm06.pdf) | [non-PR] magazine review, abstract only |
| Review: facets avoid dead ends and raise satisfaction; field results "varied widely" and depend on implementation | [Fagan, ITAL 2010](https://doi.org/10.6017/ital.v29i2.3144) | [PR] refereed journal (article's review process not verified), full text |

What this means for the directory:

- **Wedding vendors have a dominant first dimension: vendor type.** Capra et al.'s caveat argues for Category as a primary, browsable axis, with the other attributes as facets. Inference.
- **Facets pay off for shortlisting** ("photographers in this area, found at the fest, not yet contacted"), not for "open the vendor I know". A name search box must exist alongside. Inference from Yee et al.
- **Result rows must carry the key attributes**, because the result list gets most of the attention (Kules et al. 2009). Inference.
- **Scale fit.** The study collections had thousands to tens of thousands of items, closer to this directory than library catalogs are ([Fagan 2010, PR](https://doi.org/10.6017/ital.v29i2.3144)). **No study tested a few hundred items curated by 1-10 users**, so transfer is by analogy.

## People keep one home per item and re-find by browsing

**Folders vs tags (personal information management):**

- Gmail study (75 people) and Windows 7 study (23 people): strong preference for folders over tags; usually one tag per item when tags were used; multiple classifications rarely used for retrieval; tag retrieval slower and less successful ([Bergman et al., JASIST 2013, PR](https://doi.org/10.1002/asi.22906), abstract only via [RePEc](https://ideas.repec.org/a/bla/jamist/v64y2013i10p1995-2012.html)).
- Questionnaire of 168 people: attitudes toward tags were more positive than observed behavior ([Bergman et al., ASIS&T 2013, PR](https://doi.org/10.1002/meet.14505001029), abstract only). Inference: a request for "tags" is weak evidence that tags will be used.
- Caveat: these were 2011-2013 tag interfaces and individual collections, not shared ones.

**Re-finding:**

| Finding | Source | Status |
|---|---|---|
| Keyword search used in only 39% of directed searches; people step toward targets by context ("orienteering") | [Teevan et al., CHI 2004](https://doi.org/10.1145/985692.985745) | [PR], full text; 15 graduate students |
| Folder navigation was the main retrieval method (about 56-68%) vs search (4-15%); better search engines barely changed this | [Bergman et al., ACM TOIS 2008](https://doi.org/10.1145/1402256.1402259) | [PR], abstract via search snippet |
| Navigation succeeded in about 94% of retrievals at about 14.8 s; users avoided both deep and very large folders | [Bergman et al., JASIST 2010](https://doi.org/10.1002/asi.21415) | [PR], abstract only |
| 345 email users, 85,000+ refinding actions: elaborate filing did not improve retrieval; search and threads did better; scrolling was most common | [Whittaker et al., CHI 2011](https://research.ibm.com/publications/am-i-wasting-my-time-organizing-email-a-study-of-email-refinding) | [PR], abstract only |
| Time and people were key retrieval cues (230+ users) | [Dumais et al., SIGIR 2003](https://doi.org/10.1145/860435.860451) | [PR], abstract only |
| Bookmark-style lists accumulate without pruning | [Boardman and Sasse, CHI 2004](https://doi.org/10.1145/985692.985766) | [PR], abstract only |
| Choosing a category is hard; untitled piles and automatic (date) classification help | [Malone, ACM TOIS 1983](https://doi.org/10.1145/357423.357430) | [PR], via secondary ([Information Research](https://informationr.net/ir/12-2/paper293.html)) |
| Reciprocity, recency and longevity of interaction predict which contacts matter; pruning stale contacts is unsolved | [Whittaker, Jones and Terveen, CSCW 2002](https://doi.org/10.1145/587078.587109) | [PR], abstract only |

**Depth vs breadth:**

- Task time rose with depth across five structures of 64 links (17 participants) ([Zaphiris, HFES 2000, PR](https://ktisis.cut.ac.cy/bitstream/20.500.14279/2872/6/Zaphiris2000-Depth_Vs_Breath.pdf), full text).
- In 64-item menus, a 4x16 structure was fastest with fewest errors and 8x8 was most preferred ([Kiger 1984, PR](https://doi.org/10.1016/S0020-7373(84)80018-8), via secondary: Zaphiris 2000).
- Depth hurt, but a medium structure beat the very broadest one; label "scent" mattered ([Larson and Czerwinski, CHI 1998, PR](https://doi.org/10.1145/274644.274649), abstract only).

**Tag vocabularies need many taggers:**

- Delicious tag proportions per URL stabilize over time through imitation across many users ([Golder and Huberman, J. Inf. Sci. 2006, PR](https://doi.org/10.1177/0165551506062337), abstract via search snippets).
- Synonymy, plural variants and broad-vs-narrow terms are the recurring tag problems. Remedies are suggest-while-typing, merging and "tag gardening" ([ISKO Encyclopedia, Tagging](https://isko.org/cyclo/tagging), [non-PR] secondary review).

What this means for the directory (all inferences):

- **One primary Category per provider is the structure users will maintain.** Further dimensions should be picked from lists, not typed freely.
- **With 1-10 users a free vocabulary will not converge on its own**, so labels need autocomplete, merge and rename tools.
- **Two levels of Category are enough** (for example Wedding > Photographer). Facets narrow results instead of deeper sub-folders.
- **Classification must never block capture.** The 165 seed exhibitors can enter with only "Source: AllWeddings Fest 2026" and an "Unsorted" Category.
- **Relationship facets are worth storing:** status (contacted, quoted, booked), added by, date added, last contact.

## Design rules for the facet interface

The guidance is mostly practitioner work based on large e-commerce catalogs. **No peer-reviewed study read for this report sets numeric limits.**

| Topic | Guidance | Source |
|---|---|---|
| Number of facets | Show the 5-10 most relevant; 20+ overwhelms; collapse the rest | [Baymard 2026](https://baymard.com/blog/ecommerce-filter-ui) [non-PR] |
| Values shown per facet | At least 6, up to 10, then "Show more"; 15+ causes problems; never hide only 1 value | [Baymard, truncation](https://baymard.com/blog/truncation-design) [non-PR] |
| Long value lists | Search within the facet (autocomplete per facet); supported by anecdote only | [Hearst, HCIR 2008](https://flamenco.ischool.berkeley.edu/papers/hcir08.pdf) [non-PR, workshop] |
| Depth | "Not too wide nor too deep"; show children of the current node plus an ancestor trail | [Hearst, Search User Interfaces ch. 8](https://www.searchuserinterfaces.com/book/sui_ch8_navigation_and_search.html) [non-PR, book] |
| Orthogonality | Facets work best when conceptually orthogonal; a mixed "Keywords" facet became "a hodge-podge" | [Hearst, HCIR 2008](https://flamenco.ischool.berkeley.edu/papers/hcir08.pdf) [non-PR] |
| AND/OR | OR within a facet, AND across facets ("conjunct of disjuncts"); a parent value matches all descendants | [Hearst, HCIR 2008](https://flamenco.ischool.berkeley.edu/papers/hcir08.pdf); [Baymard 2024](https://baymard.com/blog/allow-applying-of-multiple-filter-values) [non-PR] |
| Multi-select | Checkboxes, not radio buttons; mutually exclusive filters made users "far less likely" to filter effectively | [Baymard 2024](https://baymard.com/blog/allow-applying-of-multiple-filter-values) [non-PR] |
| Counts | "Blue (34)" counts are "one of the single highest-impact improvements" | [Baymard 2026](https://baymard.com/blog/ecommerce-filter-ui) [non-PR]; empty-screen reduction in [Yee et al. 2003, PR](https://doi.org/10.1145/642611.642681) |
| Empty results | Prevent the selection or give a recovery path ("Try removing X") | [Baymard 2026](https://baymard.com/blog/ecommerce-filter-ui) [non-PR] |
| Active filters | Removable chips with a per-chip remove and "Clear all"; a count-only "Filter (3)" performed poorly | [Baymard, applied filters](https://baymard.com/blog/how-to-design-applied-filters) [non-PR] |
| URL state | Keep filters in the URL for bookmarking, sharing and Back | [Algolia routing](https://www.algolia.com/doc/guides/building-search-ui/going-further/routing-urls/js/) [non-PR, vendor]; [Baymard 2026](https://baymard.com/blog/ecommerce-filter-ui) |
| Mobile | Overlay or bottom sheet behind a labelled "Filter" button, result count always visible | [NN/g 2015](https://www.nngroup.com/articles/mobile-faceted-search/) [non-PR] |
| Mobile apply mode | Contested: NN/g 2015 favors instant updates; [NN/g 2016](https://www.nngroup.com/articles/applying-filters/) and [Baymard 2026](https://baymard.com/blog/ecommerce-filter-ui) favor an Apply button with a live "Show N results" | [non-PR] |
| Search plus facets | Keyword search runs within the current faceted set, and facet counts update to describe the results; mapping query words to facet values misfires at times | [Hearst, SUI ch. 8](https://www.searchuserinterfaces.com/book/sui_ch8_navigation_and_search.html); [Hearst, HCIR 2008](https://flamenco.ischool.berkeley.edu/papers/hcir08.pdf) [non-PR] |
| Accessibility | Checkbox groups in `role="group"` with a label; partly selected parent uses `aria-checked="mixed"`; tree pattern only for real trees | [WAI-ARIA APG Checkbox](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/), [Tree View](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/) [non-PR, standard guidance] |
| Cost | Facets cost more to build and maintain than plain filters; confirm they are needed | [NN/g, Filters vs Facets](https://www.nngroup.com/articles/filters-vs-facets/) [non-PR] |

Applied to this directory (all inferences):

- **Facets:** 4-5 in total (Category, Area, Source, Status, optionally Price band).
- **Values per facet:** about 8 shown, ordered selected-first, then by count (the [Algolia default](https://www.algolia.com/doc/api-reference/widgets/refinement-list/js/)).
- **Search inside a facet:** added once a facet passes about 15-20 values.
- **Counts under OR:** a value's count is computed ignoring its own facet's selection ("disjunctive faceting"). No source read defines this computation.
- **Zero-count values:** greyed out in short facets, hidden in long ones. No source read settles hide vs disable.
- **Mobile:** filtering is local and instant, so both mobile variants are viable. Per the owner's working rules, the instant tray and the sheet with an Apply button get prototyped side by side before one is built.

## Products split into personal labels and curated categories

| Product | Model | Sharing | Source [all non-PR, official docs] |
|---|---|---|---|
| Gmail labels | Many-to-many, user-created, optional nesting, colour, per-label visibility | None: "Only you can access your labels" | [Gmail Help](https://support.google.com/mail/answer/118708); [Gmail API labels](https://developers.google.com/workspace/gmail/api/guides/labels) |
| Google Contacts labels | Many-to-many, flat; a label acts as an email group | None at label level | [Contacts Help](https://support.google.com/contacts/answer/30970) |
| Google Maps lists | Named list with description, icon and per-place comments | List is the unit: "Send a link to view"; "Invite to edit" is a separate link; one "Let others edit" toggle; viewers see who added what | [Maps Help, Computer](https://support.google.com/maps/answer/7280933?hl=en&co=GENIE.Platform%3DDesktop); [Android](https://support.google.com/maps/answer/7280933) |
| Google Business Profile | Fixed list; one primary plus additional categories; "You can't create your own category"; pick the specific one | Public | [GBP Help](https://support.google.com/business/answer/7249669) |
| Yelp | Curated parent/child tree; stable alias separate from display title; per-country availability; some values under several parents (for example Event Planning & Services > Photographers > Event Photography) | Public | [Yelp categories](https://docs.developer.yelp.com/docs/resources-categories) |
| Apple Contacts | Lists plus rule-based Smart Lists | Emailable lists | [Apple Contacts guide](https://support.apple.com/guide/contacts/use-smart-groups-adrb8f31b84a/mac) |
| Notion | Select and multi-select properties | Per page; "Notion respects the broadest level of access given to a user"; subpages inherit | [Notion properties](https://www.notion.com/help/database-properties); [Notion sharing](https://www.notion.com/help/sharing-and-permissions) |
| Airtable | Fields and views | Per view link or interface; a filter is "a convenience, not a permission" | [Airtable share menu](https://support.airtable.com/articles/4130354023-using-the-view-share-menu-in-airtable); [Interface permissions](https://support.airtable.com/articles/2193541120-interface-designer-permissions) |
| Google Drive | One parent folder per item since 2020; shortcuts for extra places, and a shortcut does not share its target | Folder inheritance; moving out of a folder drops inherited access, with a warning | [Workspace blog 2020](https://workspace.google.com/blog/product-announcements/simplifying-google-drives-folder-structure-and-sharing-models); [Drive shortcuts](https://developers.google.com/workspace/drive/api/guides/ref-single-parent); [Admin help](https://knowledge.workspace.google.com/admin/drive/moving-content-from-drive-shared-folders?hl=en) |

Patterns worth copying (inferences):

- **Primary plus additional Category** (from GBP): one value drives display and sort; the others help filtering.
- **Stable id or alias separate from the display name** (from Yelp and the Gmail API): renames do not break links or shares.
- **Maps-style sharing:** a view link and an edit invitation are separate; collaborator attribution is visible.
- **No product read shares by tag or label directly.** Gmail and Contacts labels never leave the account. Sharing per label is therefore new ground, assembled from list, page, view and folder precedents.

## Sharing per label means union access and explicit guards

**Model (peer-reviewed basis):**

- Google's Zanzibar expresses access as relation tuples (`label:L#viewer@user:U`). An item can inherit viewers from every parent it links to through `tuple_to_userset`, and the results combine by union ([Pang et al., USENIX ATC 2019, PR](https://www.usenix.org/system/files/atc19-pang.pdf), sec. 2.1-2.3).
- **Applied to the app (inference):** `provider.viewer = owner + (label->viewer for each label on the provider, including ancestors)`.
- **No dedicated service is needed at this scale (inference).** A `share(label_id, grantee, role)` table joined to `provider_label`, checked inside the request transaction, is enough.
- Zanzibar's "new enemy" race: a user removed from a folder can still see documents added after the removal if checks ignore ordering ([Pang et al. 2019, PR](https://www.usenix.org/system/files/atc19-pang.pdf), sec. 2.2). Inference: a single database checked inside the request transaction avoids this.

**Documented pitfalls and what they imply:**

| Pitfall | Evidence | Guard for this app (inference) |
|---|---|---|
| Applying a shared label widens access | Notion: broadest grant wins ([Notion](https://www.notion.com/help/sharing-and-permissions)) | Mark shared labels visibly; confirm "Visible to N people" when one is applied |
| Removing a label drops access | Drive: inherited access ends, direct grants stay, with a warning ([Admin help](https://knowledge.workspace.google.com/admin/drive/moving-content-from-drive-shared-folders?hl=en)) | Warn an editor who removes the label that grants their own access |
| Sharing a parent shares its subtree | Notion and Drive inheritance; Zanzibar parent rewrite | Show the effective provider count before confirming a share on a Category parent |
| Filters mistaken for security | Airtable: filters "don't decide who can open the page"; hidden fields can surface in share links ([Airtable](https://support.airtable.com/articles/2193541120-interface-designer-permissions), [share menu](https://support.airtable.com/articles/4130354023-using-the-view-share-menu-in-airtable)) | Server-side projection: viewers never receive the owner's other label names (for example "Too expensive"), private notes or status unless the share includes them |
| Links work until replaced | Airtable: "Disable link" vs "Generate new link" ([share menu](https://support.airtable.com/articles/4130354023-using-the-view-share-menu-in-airtable)); Maps documents only coarse revocation ([Maps Help](https://support.google.com/maps/answer/7280933?hl=en&co=GENIE.Platform%3DDesktop)) | Store only a token hash per link; offer revoke and regenerate; optional expiry as a condition on the grant ([OpenFGA conditions](https://openfga.dev/docs/modeling/conditions), [non-PR]) |
| Multi-parent access is hard to predict | Drive moved to one parent per item "to simplify" ([Workspace blog](https://workspace.google.com/blog/product-announcements/simplifying-google-drives-folder-structure-and-sharing-models)); detailed rationale unpublished | Provide "who can see this provider" and "what can this person see" views |
| Rename reveals intent | Not documented by any product read | Shares reference label ids; warn that recipients see the new name |

## Four options, with Option C recommended

| | A. Flat tags | B. One nested tree | C. Faceted labels, any label shareable | D. Facets plus separate shareable Lists |
|---|---|---|---|---|
| Shape | Free tags, many per provider (Gmail and Contacts style) | One folder-like tree; each provider lives in one place | 4-5 typed facets; Category is a 2-level tree with one primary value; other facets flat and multi-valued; every label belongs to exactly one facet | Same facets for finding; only hand-curated Lists (Maps style) grant access |
| Fit to evidence | Weakest: tags underused and drift with few users ([Bergman et al. 2013, PR](https://doi.org/10.1002/asi.22906); [Golder and Huberman 2006, PR](https://doi.org/10.1177/0165551506062337)) | Fits "one home" and browsing ([Bergman et al. 2008, PR](https://doi.org/10.1145/1402256.1402259)) but cannot express Area x Source x Status without duplication | Fits a dominant type axis plus multi-attribute filtering ([Capra et al. 2007, PR](https://doi.org/10.1145/1255175.1255267); [Yee et al. 2003, PR](https://doi.org/10.1145/642611.642681)) | Same as C for finding |
| Sharing per label | Simple, but every tag is a potential grant | Clean subtree inheritance, but only one sharing axis | Share "Category: Photographer" or "Source: AllWeddings Fest 2026" directly; union access | Clearest audit; mirrors Drive's split between organizing and granting |
| Main risk | Vocabulary sprawl; accidental oversharing | Forced single placement; deep trees slow ([Zaphiris 2000, PR](https://ktisis.cut.ac.cy/bitstream/20.500.14279/2872/6/Zaphiris2000-Depth_Vs_Breath.pdf)) | Applying a label silently widens access unless guarded | Two concepts to learn; a list duplicates a facet value when the goal is "share all photographers" |

**Recommended: Option C, with the guards from the previous section.** Reasons:

- It matches the owner's leaning and the decision already made to share per label, Maps style.
- It follows the strongest evidence: one browsable type axis plus orthogonal facets.
- A provider's labels already answer "who can see it" as a union, so no second membership list has to be maintained.

Concrete shape of Option C. Every item below is an inference built from the sources above.

- **Facets.** Each facet has a name, a kind (tree or flat), multi-select on, and an owner-only schema.
  - Category: 2 levels, one primary value per provider plus additional values.
  - Area.
  - Source: the seed import sets "AllWeddings Fest 2026".
  - Status: contacted, quoted, booked, archived.
  - Lists: free, hand-curated groups, covering Maps-style ad hoc sharing.
- **Labels.** Each label has a stable id, a slug, a display name and aliases (for example "Foto" for Photographer).
  - Autocomplete is case- and diacritic-insensitive, and the app asks before creating a new label.
  - Maintenance tools: rename, merge, move, a list of labels used once or never.
- **Filtering.** OR within a facet, AND across facets, counts next to every value, removable chips, filter state in the URL, and a name search that runs within the current filters.
- **Sharing.**
  - A share is a label, a Google account and a role (can view or can edit). The role can view also has a secret link, revocable and regenerable.
  - Access is the union over the provider's labels and their ancestors.
  - Can edit lets the person edit providers that carry the label and apply the label to other providers.
  - Status, private notes and unshared label names stay with the owner unless a share includes them.
- **Capture.** Saving a provider never requires a Category. "Unsorted" is a normal value.

**When to choose D instead:** if the owner expects to share mostly hand-picked shortlists rather than whole categories or sources, or wants to be certain that tagging can never change who sees what. **Migration path:** Lists already exist as a facet in C, so moving to D means restricting grants to that facet. Inference.

**Not known:**

- No study tests faceted navigation on a few hundred items curated by 1-10 users.
- No study of folders vs tags in a small shared group was found.
- No product documents per-label sharing, label renames seen by recipients, or what viewers see of the owner's other labels.
- Several findings rest on abstracts or secondary summaries, as marked: Capra et al. 2007, English et al. 2002, Kiger 1984, Malone 1983, Kules et al. 2009 and 2012, Golder and Huberman 2006.
- Not obtained: [Civan et al. 2008](https://www.aminer.org/pub/53e9bb4bb7602d970478949d/better-to-organize-personal-information-by-folders-or-by-tags-the-devil) (folders vs tags, ASIS&T), Hearst's SIGIR 2006 facet design paper, and Tunkelang's book "Faceted Search".

## Conclusion

The choice the owner faces is less about facets versus tags than about which labels grant access. The evidence on finding things points clearly to a shallow type axis with a few orthogonal facets. The evidence on sharing comes almost entirely from product documentation and one peer-reviewed systems paper, and it shows that a multi-parent model is workable only when overlapping access is resolved as a union and made visible. Option C keeps one concept for both organizing and sharing at the cost of guard dialogs. Option D removes the guards at the cost of a second concept. Either way, the riskiest part to get right is server-side projection, meaning what a viewer never receives, not the facet UI. The two mobile filter variants and the share-confirmation flow are the pieces worth prototyping first.
