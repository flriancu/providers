# Peer-reviewed evidence: faceted vs hierarchical vs tag organization, browsing and re-finding

Scope: evidence that can justify the classification model of a small private directory of providers
(wedding vendors first, later any trade), 1-10 users, a few hundred to a few thousand entries.

Reading key for each finding: **[PR]** = peer-reviewed venue (journal, CHI/JCDL/SIGIR/CSCW/ASIS&T
proceedings, HFES proceedings); **[non-PR]** = not peer-reviewed. "Verified" = I read the full text
(PDF text extracted locally) or the publisher/indexer abstract page, as stated per item. Citations
link to DOI, the publisher, an indexer (DBLP, RePEc) or an author/institutional repository.

## 1. Faceted navigation vs keyword search vs plain hierarchies

### Takeaway
In controlled studies, hierarchical faceted navigation (several independent category dimensions,
each optionally hierarchical, with result counts) beats keyword-only search on recall-oriented and
multi-attribute tasks and is strongly preferred, but not on single-attribute lookups and not on
speed; when the domain has one dominant mental model, a well-designed single hierarchy can be
preferred. Evidence comes from small lab samples (12-32 people) on collections of thousands to tens
of thousands of items, which is close in size to the target directory.

### Cited Findings
- **Yee, Swearingen, Li, Hearst, "Faceted metadata for image search and browsing", CHI 2003 [PR].**
  Verified from full text (author-hosted PDF). [doi:10.1145/642611.642681](https://doi.org/10.1145/642611.642681);
  [PDF](https://flamenco.berkeley.edu/papers/flamenco-chi03.pdf)
  - Studied: Flamenco faceted category (FC) interface vs a keyword baseline that was deliberately
    stronger than Google Images (it also showed category links on item detail pages).
  - Sample / method: 32 art-history students (after discarding 2 outliers), within-subjects,
    interface order counterbalanced, ~35,000 fine-arts images; 4 tasks per interface (2 open browsing,
    2 structured); logs, questionnaires, observation.
  - Results: "find all US woodcuts": 77% of FC users retrieved all relevant items vs 21% in baseline;
    aquatints task 81% vs 57%. Empty-result screens in structured tasks: 26 (FC) vs 82 (baseline).
    Overall preference 29 of 32 for FC (abstract rounds to 90%); "more useful for usual tasks"
    28 vs 4; "helped you learn more about the collection" 31 vs 1; "more likely to dead-end" 3 vs 28.
    For a single-facet task ("find images of roses") preference split 16 FC vs 15 baseline.
    Participants combined several facets in 19% of open-task queries and 45% of structured-task queries.
  - Limits: FC was slower (Task 2: 12 min 6 s vs 9 min 30 s, partly due to 3.7 s vs 0.3 s per-step
    latency and system errors in 5 of 32 sessions); strong order effect (baseline rated lower when
    seen after FC); domain-expert students; no long-term use; metadata quality was curated.
  - Applies: a provider directory has the same structure (category, location, price band,
    availability, style) and the same multi-attribute questions ("photographers in region X under
    budget Y who do destination weddings"). Show counts per facet value to avoid empty results; do
    not expect faceting to speed up simple "find vendor named X" lookups, where a search box suffices.
- **English, Hearst, Sinha, Swearingen, Yee, "Hierarchical faceted metadata in site search
  interfaces", CHI 2002 Extended Abstracts [PR, short paper / extended abstract].** Bibliography
  verified on [DBLP](https://dblp.org/rec/conf/chi/EnglishHSSY02); abstract via
  [author PDF](https://bebop.berkeley.edu/papers/chi02_short_paper.pdf); [doi:10.1145/506443.506517](https://doi.org/10.1145/506443.506517).
  - Abstract: an earlier study on a moderate-sized web site found users preferred dynamically
    organized faceted metadata over standard search; this work scales the design to large collections.
  - Secondary detail reported by Fagan 2010 (below), not verified in the original: 19 participants;
    facets were used for refinement more than "keyword search within" (27.6% vs 9%), and 7% of
    participants expanded a query by removing a facet term.
  - Applies: users do use "remove a filter" (broadening), so selected facet values must be visible
    and individually removable (breadcrumb-style).
- **Kules & Shneiderman, "Users can change their web search tactics: Design guidelines for
  categorized overviews", Information Processing & Management 44(2):463-484, 2008 [PR].**
  Abstract-level only, via [researchr](https://researchr.org/publication/KulesS08) and
  [author preprint](https://www.cs.umd.edu/users/ben/papers/Kules2008Users.pdf);
  [doi:10.1016/j.ipm.2007.07.014](https://doi.org/10.1016/j.ipm.2007.07.014).
  - 24 sophisticated users, 4 exploratory searches in a 2-hour session; categorized overviews of
    results made searchers explore deeper and feel more organized and better able to assess results;
    no significant difference in the quality of the output (article ideas). Seven tactics identified.
  - Limits: subjective benefit without measured outcome gain; journalism-style task.
  - Applies: category overviews help a user judge "what is in the directory" (coverage), which
    matters when a small team curates a list and newcomers need to see what exists.
- **Kules, Capra, Banta, Sierra, "What do exploratory searchers look at in a faceted search
  interface?", JCDL 2009, pp. 313-322 [PR].** Abstract and secondary summaries only;
  [doi:10.1145/1555400.1555452](https://doi.org/10.1145/1555400.1555452); [researchr](https://researchr.org/publication/KulesCBS09).
  - Eye tracking + stimulated recall on a faceted library catalog: per task, roughly 50 s fixating
    results, 25 s on facets, 6 s on the query box. Sample size not verified.
  - Follow-up: Kules & Capra, JASIST 63(1):114-138, 2012 [PR]
    ([RePEc record](https://ideas.repec.org/a/bla/jamist/v63y2012i1p114-138.html)): per search-result
    summary, facets took about 10-30% of interface use and a 60-second demo video increased facet
    use. I saw only the abstract via a search snippet; numbers not verified in full text.
  - Applies: facets are looked at but the result list dominates; result rows must carry the key
    attributes (category, area, price band) so users can judge without opening each entry.
- **Capra, Marchionini, Oh, Stutzman, Zhang, "Effects of structure and interaction style on
  distinct search tasks", JCDL 2007, pp. 442-451 [PR].** Bibliography via
  [DBLP](https://dblp1.uni-trier.de/rec/conf/jcdl/CapraMOSZ07.html); [doi:10.1145/1255175.1255267](https://doi.org/10.1145/1255175.1255267).
  Details only via Fagan 2010 (secondary, below); original not read.
  - Three interfaces to the US Bureau of Labor Statistics site (existing hyperlink hierarchy + keyword
    search vs two faceted designs); between-subjects N=28 and within-subjects N=12; simple lookup,
    complex lookup and exploratory tasks.
  - Users preferred the familiar hierarchy + search site, but named the facets as the best feature of
    the experimental interfaces. Quoted conclusion: "If there is a predominant model of the
    information space, a well designed hierarchical organization might be preferred."
  - Applies: for wedding vendors there is a dominant first dimension (vendor type: venue,
    photographer, caterer...). That argues for a shallow primary hierarchy on "type of provider"
    with facets for the remaining attributes, rather than an all-facets-equal design.
- **Hearst, "Clustering versus faceted categories for information exploration", Communications of
  the ACM 49(4):59-61, 2006 [magazine article; CACM research-section pieces are editor-reviewed,
  not a primary empirical study].** [doi:10.1145/1121949.1121983](https://doi.org/10.1145/1121949.1121983);
  [author PDF](https://flamenco.ischool.berkeley.edu/papers/cacm06.pdf). Abstract-level only.
  - Summarizes usability studies: users find automatically generated clusters hard to interpret and
    prefer predictable category structures at uniform granularity.
  - Applies: use human-defined, stable category labels; do not auto-cluster providers.
- **Fagan, "Usability studies of faceted browsing: a literature review", Information Technology and
  Libraries 29(2):58-66, 2010 [PR as a refereed journal article per the journal; I did not verify the
  review process of this specific article].** Verified from full text (publisher PDF).
  [doi:10.6017/ital.v29i2.3144](https://doi.org/10.6017/ital.v29i2.3144);
  [publisher page](https://ital.corejournals.org/index.php/ital/article/view/3144)
  - Narrative (not systematic) review. Summarized empirical results from researcher-built interfaces:
    facets help avoid dead ends; users are faster (Uddin & Janecek, N=19, faster on 2 of 3 tasks);
    find more (Pratt, Hearst & Fagan, N=15 patients: mean answers in 4 min 7.80 faceted vs 4.53
    clustered vs 5.60 relevance-ranked, p<0.05; no difference in time-to-answer); are more satisfied
    and confident; but may prefer the familiarity of hyperlinks + keyword search, and initial
    reactions can be cautious.
  - Library catalog field studies were small and product-specific (e.g. 5 undergraduates, only 1 of 5
    used a topic facet successfully; NCSU Endeca study: 5 vs 5, 3 of 5 used facets) and results
    "varied widely"; implementation details strongly affect performance and preference.
  - Limits stated by the author: experimental collections were "much smaller and less complicated"
    than full library catalogs.
  - Applies: the experimental collections (thousands of items) are closer to a few-thousand-entry
    directory than library catalogs are, so the positive lab evidence transfers better here than to
    big catalogs. Facet visibility and labeling are the main failure points in field use.

### Inferences
- For a directory of a few hundred to a few thousand providers, the evidence supports: one primary,
  shallow category axis (provider type) plus a small set of orthogonal facets (location, price band,
  style or specialty, status such as "booked/contacted"), with counts and a search box for name
  lookups. This combines the Capra et al. "dominant model" caveat with the Yee et al. multi-attribute
  gains.
- Faceting pays off for "find all that match" and comparison tasks (shortlisting vendors), not for
  "open the one I know"; both paths must exist.

### Gaps
- No controlled study found that tests faceted navigation on a collection as small as a few hundred
  items, or with 1-10 users who also curate the data; transfer is by analogy.
- English et al. 2002 numbers (19 participants, 27.6% vs 9%) come via Fagan, not the original.
- Capra et al. 2007 and Kules et al. 2009 sample sizes and statistics not verified in full text.

## 2. Personal information management: folders vs tags

### Takeaway
When people organize their own items and are given both options, they overwhelmingly keep using
single-location folders; tags, where used, are mostly used one per item, and tag-based retrieval was
slower and less successful in a controlled test. Stated attitudes toward tags are more positive than
behavior.

### Cited Findings
- **Bergman, Gradovitch, Bar-Ilan, Beyth-Marom, "Folder versus tag preference in personal
  information management", JASIST 64(10):1995-2012, 2013 [PR].** Verified from the indexed abstract
  ([RePEc/IDEAS](https://ideas.repec.org/a/bla/jamist/v64y2013i10p1995-2012.html)), not the full text.
  [doi:10.1002/asi.22906](https://doi.org/10.1002/asi.22906)
  - Gmail study: 75 participants told about folder-style and tag-style labels; storage behavior
    observed after 1 month; self-reported retrieval frequencies.
  - Windows 7 study: 23 participants taught to tag, asked to tag all files for 2 weeks, then 5 weeks
    of free choice; logging software, questionnaire, controlled retrieval task, interview.
  - Results: strong preference for folders over tags for both storage and retrieval; when tags were
    used, usually one tag per item; multiple classifications, when made, were rarely used for
    retrieval; tag retrieval had lower success and was slower.
  - Limits: Gmail labels of 2011-2012 and Windows 7 file tagging had weak tag UIs; personal (not
    shared) collections; one culture (Israel); behavior of novices with tags.
  - Applies: do not build the directory on free tags as the primary organizer. If several users
    share it, a single canonical "type" per provider is what users will maintain; additional
    dimensions should be structured facet fields, not open tags.
- **Bergman, Gradovitch, Bar-Ilan, Beyth-Marom, "Tagging personal information: A contrast between
  attitudes and behavior", Proceedings of ASIS&T 50(1), 2013 [PR, conference paper].** Abstract via
  [publisher](https://asistdl.onlinelibrary.wiley.com/doi/10.1002/meet.14505001029) /
  [CRIS record](https://cris.iucc.ac.il/en/publications/tagging-personal-information-a-contrast-between-attiudes-behavior/);
  [doi:10.1002/meet.14505001029](https://doi.org/10.1002/meet.14505001029).
  - Questionnaire N=168 from the same population: attitudes toward tags were more positive than the
    observed behavior in the JASIST study.
  - Applies: users asking for "tags" in requirements is weak evidence that they will use them.
- **Civan, Jones, Klasnja, Bruce, "Better to organize personal information by folders or by
  tags?: The devil is in the details", Proceedings of ASIS&T 45(1):1-13, 2008 [PR, conference
  paper].** The paper exists: listed by [AMiner](https://www.aminer.org/pub/53e9bb4bb7602d970478949d/better-to-organize-personal-information-by-folders-or-by-tags-the-devil)
  and [researchr (Klasnja alias)](https://researchr.org/alias/predrag-v.-klasnja). I could not read
  the full text or abstract; DOI not verified.
  - Secondary description only: participants used folders and tags side by side and reported
    trade-offs of each; Bergman et al. 2013's review is described as citing it on the cognitive-load
    side in favor of tags and on time as showing no substantial difference. Treat as unverified.
- **Jones, Phuwanartnurak, Gill, Bruce, "Don't take my folders away! Organizing personal information
  to get things done", CHI 2005 Extended Abstracts [PR, short paper].** Record at
  [University of Washington repository](https://digital.lib.washington.edu/researchworks/handle/1773/2031).
  Abstract not read; title and venue verified only. Its title summarizes the stance that folders
  carry planning and task structure for their owners.
- **Bergman & Whittaker, "The Science of Managing Our Digital Stuff", MIT Press, 2016 [non-PR
  scholarly monograph by the main PIM researchers; synthesizes their peer-reviewed studies].**
  [Publisher record via Oxford Academic / MIT Press Scholarship](https://academic.oup.com/mit-press-scholarship-online/book/22884);
  ISBN 9780262035170. Not read; bibliographic details only. It presents the "user-subjective
  approach" (organize by attributes meaningful to the user, such as projects and importance).

### Inferences
- For a small shared directory, "one home per provider" (a single type) is the model users maintain
  and retrieve through; extra classification should be cheap, structured and optional.
- Tags as an unconstrained vocabulary are the weakest option in the PIM evidence; a controlled list
  of facet values (picked, not typed) avoids the vocabulary drift that free tags show.

### Gaps
- Civan et al. 2008 content unverified (no full text or abstract reached).
- No PIM study found on shared folders vs tags in a 2-10 person group; the PIM work is individual.

## 3. Re-finding: searching vs filing and navigating

### Takeaway
For one's own items, people mostly re-find by navigating to a remembered location (orienteering),
even when search is good; in email, elaborate filing did not improve retrieval success, and search
plus threads worked better. Both modes need support: a stable location for browsing, and search for
when memory of location fails.

### Cited Findings
- **Whittaker, Matthews, Cerruti, Badenes, Tang, "Am I wasting my time organizing email? A study of
  email refinding", CHI 2011 (pp. 3449-3458 per a secondary listing) [PR].** Abstract verified at
  [IBM Research](https://research.ibm.com/publications/am-i-wasting-my-time-organizing-email-a-study-of-email-refinding);
  [doi:10.1145/1978942.1979457](https://doi.org/10.1145/1978942.1979457).
  - Field study of 345 long-term users of an instrumented client with search, folders, tags and
    threads; over 85,000 refinding actions logged.
  - Users with complex folders relied on them, but this preparatory filing was inefficient and did
    not improve retrieval success; search and threading led to more effective finding. Scrolling was
    the most common refinding behavior.
  - Limits: email (high volume, time-ordered, mostly received not curated); one corporate population.
  - Applies: do not require users to classify deeply up front; a directory needs sensible default
    sorting (recently added or contacted) and good search, because scrolling a short list is what
    people actually do.
- **Bergman, Beyth-Marom, Nachmias, Gradovitch, Whittaker, "Improved search engines and navigation
  preference in personal information management", ACM TOIS 26(4):20:1-20:24, 2008 [PR].**
  Bibliography via [DBLP](https://dblp.uni-trier.de/rec/journals/tois/BergmanBNGW08.html);
  [doi:10.1145/1402256.1402259](https://doi.org/10.1145/1402256.1402259). Findings via search-result
  summary of the abstract; full text not read.
  - Windows study (Google Desktop vs XP Search Companion) and larger Mac study (Spotlight vs
    Sherlock). Folder navigation was the main file retrieval method (estimates 56-68% of retrievals)
    vs search 4-15%; better search engines had limited and inconsistent effect on search use; search
    was a last resort when location was forgotten.
  - Applies: users will browse their directory by category; the category axis must be stable and
    predictable, with search as the fallback.
- **Bergman, Whittaker, Sanderson, Nachmias, Ramamoorthy, "The effect of folder structure on personal
  file navigation", JASIST 61(12):2426-2441, 2010 [PR].** Abstract via
  [EconPapers](https://econpapers.repec.org/RePEc:bla:jamist:v:61:y:2010:i:12:p:2426-2441);
  [doi:10.1002/asi.21415](https://doi.org/10.1002/asi.21415).
  - Navigation succeeded for about 94% of file retrievals, about 14.8 s each; time and success
    depended on folder size and depth; users avoided both deep hierarchies and very large folders
    (read as adaptive); a model of depth and size effects showed a trade-off optimum.
  - Sample size not verified.
  - Applies: keep category lists shallow and each list short enough to scan; split a category only
    when it gets large.
- **Teevan, Alvarado, Ackerman, Karger, "The perfect search engine is not enough: a study of
  orienteering behavior in directed search", CHI 2004, pp. 415-422 [PR].** Verified from full text
  ([author PDF](https://people.csail.mit.edu/teevan/work/publications/papers/chi04.pdf));
  [doi:10.1145/985692.985745](https://doi.org/10.1145/985692.985745).
  - 15 MIT computer-science graduate students; 151 short semi-structured interviews, twice daily
    over five days, about their most recent search in email, files and the web.
  - Keyword search was used in only 39% of searches, even for known targets; people took small
    steps using context ("orienteering"), which the authors argue lowers cognitive load, preserves
    a sense of location and helps understand results.
  - Limits: small, technically expert sample; self-report; 2004 tools.
  - Applies: users will remember "it was one of the florists Ana added" more readily than a name;
    the directory should support stepping by category and by who added or when.
- **Boardman & Sasse, "'Stuff goes into the computer and doesn't come out': a cross-tool study of
  personal information management", CHI 2004, pp. 583-590 [PR].** Abstract via
  [UCL Discovery](https://discovery.ucl.ac.uk/id/eprint/13438/);
  [doi:10.1145/985692.985766](https://doi.org/10.1145/985692.985766).
  - Studied files, email and bookmarks per participant, with longitudinal data for a subset; found
    varied strategies within and across tools and that supportive tools can discourage reflection on
    one's own strategy. Sample size not verified from the abstract.
  - Applies: bookmarks-style lists (the closest analog to a vendor list) tend to accumulate without
    pruning; the directory needs review and archive affordances.
- **Dumais, Cutrell, Cadiz, Jancke, Sarin, Robbins, "Stuff I've Seen: a system for personal
  information retrieval and re-use", SIGIR 2003, pp. 72-79 [PR].** Abstract via
  [Webis IR Anthology](https://ir.webis.de/anthology/2003.sigirconf_conference-2003.12);
  [doi:10.1145/860435.860451](https://doi.org/10.1145/860435.860451).
  - Deployed to over 230 Microsoft employees; time and people were important retrieval cues; users
    found information more easily.
  - Applies: "added by" and "last contacted / date added" are worth storing and filtering on.
- **Malone, "How do people organize their desks? Implications for the design of office information
  systems", ACM TOIS 1(1), 1983 [PR].** [doi:10.1145/357423.357430](https://doi.org/10.1145/357423.357430).
  Only secondary descriptions read (e.g. [Information Research 12(2) paper 293](https://informationr.net/ir/12-2/paper293.html)).
  - Interviews and office tours (small sample); filing into titled categories was hard because
    choosing a classification is hard; recommended automatic classification (e.g. by date) and
    untitled "piles".
  - Applies: an "Unsorted / inbox" state for new entries lowers the cost of capture.
- **Lansdale, "The psychology of personal information management", Applied Ergonomics 19(1):55-66,
  1988 [PR, theoretical review].** Citation verified only via secondary sources (see search results
  pointing to [CACM introduction](https://cacm.acm.org/research/introduction-21)); not read. Commonly
  cited for the claim that categorizing items is cognitively hard and category names are poorly
  recalled later. Unverified in the original.

### Inferences
- Re-finding in a small directory will mostly be browse-by-category plus scrolling a short sorted
  list; search must handle names, partial names and notes text for the remaining cases.
- Up-front classification effort should be minimal and must not block saving an entry.

### Gaps
- "Fitzpatrick & Dumais" named in the brief: I could not identify a peer-reviewed paper by that
  author pair on re-finding; the closest Dumais work is "Stuff I've Seen" (above). Not verified.
- Sample sizes for Boardman & Sasse 2004, Bergman et al. 2010 and Malone 1983 not verified.

## 4. Hierarchy depth vs breadth

### Takeaway
Across menu and web-link studies with a fixed set of 64-512 targets, deeper hierarchies are slower
and more error-prone; broad, shallow structures (2 levels) do best, with a medium structure
sometimes beating the very broadest. Breadth at the top and at the leaves is recommended.

### Cited Findings
- **Zaphiris, "Depth vs breadth in the arrangement of web links", Proceedings of the HFES 44th Annual
  Meeting, 2000, pp. 139-144 [PR, conference].** Verified from full text
  ([Cyprus University of Technology repository](https://ktisis.cut.ac.cy/bitstream/20.500.14279/2872/6/Zaphiris2000-Depth_Vs_Breath.pdf)).
  - Own study: 17 participants (age 19-45), 64 end nodes about Cyprus, five link structures
    (2^6, 4^3, 8^2, 4x16, 16x4), 2 tasks each; task completion time increased with depth; error
    effect not significant (too few errors). Small N.
  - Its review section (secondary for these): Miller 1981 (64 items as 64^1, 2^6, 4^3, 8^2;
    response time rose with depth); Snowberry, Parkinson & Sisson 1983 (replication; visual scanning
    ability predicted performance in deep menus; accuracy improved with breadth); Kiger 1984 (64
    items, five structures; time and errors rose with depth; 4x16 fastest with fewest errors; 8x8
    most preferred); Wallace et al. 1987 (4^3 beat 2^6); Norman & Chin 1988 (256 items, recommend
    more breadth at root and leaves); Jacko & Salvendy 1996 (perceived complexity rises with depth).
- **Kiger, "The depth/breadth trade-off in the design of menu-driven user interfaces",
  International Journal of Man-Machine Studies 20(2):201-213, 1984 [PR].** Bibliography verified via
  [DBLP](https://dblp.org/rec/journals/ijmms/Kiger84);
  [doi:10.1016/S0020-7373(84)80018-8](https://doi.org/10.1016/S0020-7373(84)80018-8). Results above
  are from Zaphiris 2000's summary, not the original.
- **Miller, "The depth/breadth tradeoff in hierarchical computer menus", Proceedings of the Human
  Factors Society 25th Annual Meeting, 1981, pp. 296-300 [PR, conference].** Citation as given in
  Zaphiris 2000; no DOI or online copy checked.
- **Larson & Czerwinski, "Web page design: implications of memory, structure and scent for
  information retrieval", CHI 1998, pp. 25-32 [PR].** Abstract verified at
  [Microsoft Research](https://www.microsoft.com/en-us/research/publication/web-page-design-implications-memory-structure-scent-information-retrieval/);
  [doi:10.1145/274644.274649](https://doi.org/10.1145/274644.274649); [DBLP](https://dblp.org/rec/conf/chi/LarsonC98).
  - Increased depth harmed web search performance, but a medium structure balancing depth and
    breadth outperformed the broadest, shallowest one; structures were designed for good "scent"
    (label quality). Exact structures and N not verified (full text not read).
- **Bergman et al. 2010 (section 3)** found the same trade-off in personal file hierarchies: users
  avoid both deep and overly large folders.

### Inferences
- For a few hundred to a few thousand providers, two levels are enough: provider type (about 10-30
  values for weddings; more once trades are added, which may need one grouping level above) and the
  list of providers, narrowed by facets rather than by deeper sub-folders.
- Label quality ("scent") matters as much as shape: category names must predict their contents.

### Gaps
- The depth/breadth studies use expert-built, fixed, single-path menus with one correct location per
  item; they do not test faceted narrowing or user-curated categories.
- Larson & Czerwinski structure sizes and sample not verified from full text.

## 5. Multiple classification: one item in several categories; social tagging

### Takeaway
In personal collections, people rarely assign more than one category and rarely use multiple
classifications to re-find; in public social tagging, tag vocabularies stabilize only with many
taggers per item. A 1-10 person directory is far from that regime, so multi-label value must come
from structured facets, not emergent tags.

### Cited Findings
- **Bergman et al. 2013 (section 2) [PR]:** one tag per item was typical; multiple classifications
  were rarely used for retrieval; tag retrieval slower and less successful.
  [doi:10.1002/asi.22906](https://doi.org/10.1002/asi.22906)
- **Golder & Huberman, "Usage patterns of collaborative tagging systems", Journal of Information
  Science 32(2):198-208, 2006 [PR].** Bibliography and abstract confirmed via search results and the
  [author-hosted PDF location](https://collablab.northwestern.edu/CollabolabDistro/nucmc/GolderAndHuberman-usage%20patterns%20collab%20tagging.pdf)
  (not read in full); [doi:10.1177/0165551506062337](https://doi.org/10.1177/0165551506062337).
  - Analysis of Del.icio.us data: regularities in user activity, tag frequencies and kinds of tags;
    the relative proportions of tags for a given URL stabilize over time, modeled as imitation and
    shared knowledge.
  - Applies: stabilization depends on many independent taggers per item. With 1-10 users, a free tag
    vocabulary will not converge on its own; a curated value list is needed.
- **Marlow, Naaman, boyd, Davis, "HT06, tagging paper, taxonomy, Flickr, academic article, to read",
  ACM Hypertext 2006 [PR].** Not verified in this session (no source fetched); listed only so the
  writer knows it exists. It proposes a taxonomy of tagging system designs and tag incentives.

### Inferences
- Allow a provider to carry several values within a facet (a venue that also caters; a photographer
  who also films) because that matches reality, but make the values picked from a list and keep one
  primary type for browsing. This keeps the "one home" model users maintain (section 2) while
  supporting multi-attribute filtering (section 1).

### Gaps
- I found no controlled study isolating the effect of multi-category assignment on retrieval in a
  small shared collection.
- Marlow et al. 2006 not verified.

## 6. Directories, business listings and contact management

### Takeaway
Peer-reviewed work on contact management shows the hard problem is selecting the few important
contacts from many and pruning stale ones, with interaction history (recency, reciprocity,
longevity) as the best predictor of importance. I found no peer-reviewed study of classification
schemes for small business-listing directories.

### Cited Findings
- **Whittaker, Jones, Terveen, "Contact management: identifying contacts to support long-term
  communication", CSCW 2002, pp. 216-225 [PR].** Abstract via search results and
  [White Rose eprints](https://eprints.whiterose.ac.uk/8387);
  [doi:10.1145/587078.587109](https://doi.org/10.1145/587078.587109) (DOI as listed in the
  bibliographic records found; not resolved).
  - Field interviews with business professionals plus a lab study in which participants marked
    important contacts in their own email archives; reciprocity, recency and longevity of
    interaction were strong predictors of contact importance; removing stale contacts from long-term
    archives was a separate unsolved problem. Sample sizes not verified.
  - Applies: for a vendor directory, status and history fields (contacted, quoted, booked, last
    contact date) are likely more useful for re-finding the right provider than finer category
    trees; an archive state handles stale entries.
- **Hearst 2006 and Yee et al. 2003 (section 1)** are the closest controlled evidence for browsing
  a catalog of items with several attributes, which is what a provider listing is.

### Inferences
- Combine a shallow type hierarchy and facets (sections 1, 4) with relationship facets (status, last
  contact, added by) drawn from the contact-management and re-finding evidence (sections 3, 6).

### Gaps
- No peer-reviewed study found on how people classify or browse local business listings (yellow
  pages style) or wedding-vendor lists specifically; the closest evidence is e-commerce and catalog
  faceted search, which another researcher covers from the design-guidance side.
