# How products model labels, categories and lists, and how they share by label

Scope: official documentation (help centers, developer docs) read on 2026-11-16, plus one peer-reviewed paper (Zanzibar, USENIX ATC 2019). Source type is marked on first use: [official doc], [vendor blog], [peer-reviewed], [search snippet only] (the claim comes from a search-result excerpt of the official page, which was not fetched in full). No sign-in, no API calls.

Source register:
- Gmail Help, "Create labels to organize Gmail" [official doc, not peer-reviewed] - https://support.google.com/mail/answer/118708
- Gmail API, labels guide and `users.labels` reference [official doc] - https://developers.google.com/workspace/gmail/api/guides/labels, https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.labels
- Google Contacts Help, labels [official doc] - https://support.google.com/contacts/answer/30970
- Google Maps Help, "Create a list of places" (Android and Computer variants) [official doc] - https://support.google.com/maps/answer/7280933, https://support.google.com/maps/answer/7280933?hl=en&co=GENIE.Platform%3DDesktop
- Google Business Profile Help, categories [official doc] - https://support.google.com/business/answer/7249669
- Yelp Fusion developer docs, categories [official doc] - https://docs.developer.yelp.com/docs/resources-categories
- Apple Contacts User Guide for Mac (macOS 27) [official doc] - https://support.apple.com/guide/contacts/use-smart-groups-adrb8f31b84a/mac
- Airtable Support: view share menu; Interface Designer permissions [official doc] - https://support.airtable.com/articles/4130354023-using-the-view-share-menu-in-airtable, https://support.airtable.com/articles/2193541120-interface-designer-permissions
- Notion Help: sharing and permissions; database properties [official doc] - https://www.notion.com/help/sharing-and-permissions, https://www.notion.com/help/database-properties
- Pipedrive Knowledge Base [official doc, search snippet only] - https://support.pipedrive.com/en/article/visibility-groups, https://support.pipedrive.com/en/article/visibility-and-permissions-overview
- Zanzibar paper, Pang et al., USENIX ATC 2019, pp. 33-46 [peer-reviewed] - https://www.usenix.org/conference/atc19/presentation/pang (PDF: https://www.usenix.org/system/files/atc19-pang.pdf)
- OpenFGA docs [official doc of an open-source project, CNCF; not peer-reviewed] - https://openfga.dev/docs/modeling/parent-child, https://openfga.dev/docs/modeling/conditions, https://openfga.dev/docs/modeling/blocklists
- SpiceDB (AuthZed) docs [official doc, vendor] - https://authzed.com/docs/spicedb/concepts/schema
- Google Drive: developer docs on shortcuts; Workspace blog of 2020-03-27; Workspace Updates blog of 2021-12; Workspace admin help [official doc / vendor blog] - https://developers.google.com/workspace/drive/api/guides/ref-single-parent, https://workspace.google.com/blog/product-announcements/simplifying-google-drives-folder-structure-and-sharing-models, https://workspaceupdates.googleblog.com/2021/12/timeline-update-for-migration-of-multi-location-drive-files.html, https://knowledge.workspace.google.com/admin/drive/moving-content-from-drive-shared-folders?hl=en

## Key question 1: Classification model of each product

### Takeaway
Two families exist. Personal organizers (Gmail, Google Contacts, Google Maps lists, Apple Contacts lists, Notion multi-select) use free-form, user-created, many-to-many labels; public directories (Google Business Profile, Yelp) use a fixed, curated taxonomy with one primary category plus a few additional ones, and Yelp's is a hierarchy with stable aliases and per-country availability. The planned app's "facets" (Category, Source, Area) sit between the two: a curated tree for Category, free-form values for Source.

### Cited Findings

Gmail labels
- Labels and messages are many-to-many: "You can apply several labels to one message or thread, and one label to many" (paraphrase of the API guide); a thread's labels are the union of its messages' labels. Labels are either reserved `SYSTEM` labels (INBOX, SPAM, TRASH...) or custom `USER` labels, and users cannot create a user label with a system label's name - [Gmail API labels guide](https://developers.google.com/workspace/gmail/api/guides/labels)
- Nesting is a UI option at creation: "To include your label in another label, check the box next to 'Nest label under.'" - [Gmail Help](https://support.google.com/mail/answer/118708)
- Colours: the API allows only "the following predefined set of color values" for `textColor`/`backgroundColor`, and "Color is only available for labels that have their type set to user" - [users.labels reference](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.labels). The Help page says "You can create up to 100 custom colors for your Gmail labels" - [Gmail Help](https://support.google.com/mail/answer/118708). (The two pages differ: the API restricts to a palette while the UI allows custom colours; not reconciled.)
- Per-label display settings: `labelListVisibility` (`labelShow`, `labelShowIfUnread`, `labelHide`) and `messageListVisibility` (`show`, `hide`) - [users.labels reference](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.labels)
- Labels are private: "Only you can access your labels" and "The people you email don't get them" - [Gmail Help](https://support.google.com/mail/answer/118708)
- Deleting an email removes it "from every label and your inbox" - [Gmail Help](https://support.google.com/mail/answer/118708)

Google Contacts labels
- Labels are created from the sidebar and applied to selected contacts via "Manage labels"; a label works as an email group: typing the label name in Gmail's "To" field expands to its contacts, and only each contact's default email address is used - [Google Contacts Help](https://support.google.com/contacts/answer/30970)
- No label-level sharing is described; the only delegation is that someone with delegated access to your Gmail "can manage labels on their contacts, too" - [Google Contacts Help](https://support.google.com/contacts/answer/30970)

Google Maps saved lists
- Lists have a name, description and icon; a list is either "Private: Only you can view and edit" or "Shared: Share a link to view or edit"; several places can be saved to a list at once; default lists are "Favorites", "Want to go", "Travel plans", "Starred places", "Saved places" - [Maps Help, Android](https://support.google.com/maps/answer/7280933), [Maps Help, Computer](https://support.google.com/maps/answer/7280933?hl=en&co=GENIE.Platform%3DDesktop)
- A comment on a saved place "appears in your saved list below the place" - [Maps Help, Computer](https://support.google.com/maps/answer/7280933?hl=en&co=GENIE.Platform%3DDesktop)
- Lists can be hidden or shown on the main map; someone else's list opened via link can be saved to "Lists you saved"; export goes through Google Takeout - [Maps Help, Android](https://support.google.com/maps/answer/7280933)

Google Business Profile categories
- One primary category ("Select a primary category that best describes your business") plus additional categories; the list is fixed: "You can't create your own category"; prefer the specific option ("Nail salon" over "Salon"); "Do not select a category for every product or service"; categories affect local ranking and unlock features (menus for restaurants, class ratings for hotels); changing a category may trigger re-verification - [GBP Help](https://support.google.com/business/answer/7249669)
- The page does not state the maximum number of additional categories - [GBP Help](https://support.google.com/business/answer/7249669)

Yelp categories
- Each category has a display title and an alias; "The value in parenthesis should be used when specifying a search category input"; each entry lists the countries where it is available or "All"; categories nest in a parent/child tree - [Yelp developer docs](https://docs.developer.yelp.com/docs/resources-categories)
- Wedding-relevant branch: Event Planning & Services (`eventservices`) > Photographers (`photographers`) > Event Photography (`eventphotography`), Session Photography, Boudoir Photography (only SE, CA, DE, US); siblings include Wedding Planning (`wedding_planning`), Videographers (`videographers`), Wedding Chapels (alias spelled `weddingchappels`, only US, AU, JP); some aliases (e.g. Hotels, Wineries) appear under several parents - [Yelp developer docs](https://docs.developer.yelp.com/docs/resources-categories)

Apple Contacts
- The current guide (labelled "for macOS 27") calls them "Lists" and "Smart Lists"; a Smart List is created "by identifying something that some of your contacts have in common", e.g. any contact with "book" in the Note field; Lists and Smart Lists can be emailed and have editable distribution lists - [Apple Contacts User Guide](https://support.apple.com/guide/contacts/use-smart-groups-adrb8f31b84a/mac)

Notion
- Select = "Choose one option from a list of tags"; Multi-select = "Choose one or more options ... Useful for tagging items across multiple categories"; tag colours are randomly assigned and editable; Relation = "Connect databases and mention database pages" - [Notion Help, database properties](https://www.notion.com/help/database-properties)

Airtable
- Shared views and interfaces are the classification/sharing surface (see Key question 2). Multiple-select and linked-record field pages were not fetched.

### Inferences
- A facet tree like Category > Wedding > Photo matches Yelp's model (curated tree, stable alias separate from display title, a value may appear under several parents). Keeping a stable id/alias separate from the display name makes renames safe.
- "Primary + additional" (GBP) is a useful pattern for Category: one primary category drives display and sorting, others aid search.
- Gmail's model (many-to-many, nested, private, per-label visibility and colour) maps well to the owner's own labels; Gmail never shares labels, so it gives no precedent for sharing.

### Gaps
- Whether a Google Maps place can belong to several lists at once: not stated on the fetched pages.
- Whether deleting a Gmail or Contacts label deletes its items, and how nested Gmail labels are represented in the API name: not stated on the fetched pages.
- Airtable multiple-select and linked-record docs, Notion two-way relations page, HubSpot, Contacts+ and Monica CRM: not read (budget).
- Apple Smart List criteria list and auto-update behaviour: not stated on the fetched page.

## Key question 2: Sharing semantics (share by label/list/view, overlaps, removal, children, view vs edit, revocation, visibility of other labels)

### Takeaway
Google Maps lists are the closest precedent: a list is the unit of sharing, with a view link and a separate "invite to edit" link, and editor rights are switched off as a whole. Airtable and Notion share views/pages, and both warn that filters and hidden fields are display features, not security; Notion's rule "broadest access wins" is the documented answer to "item in a shared and a private container". No product read here documents what happens when a label is removed from an item that is shared through it, except Drive, where inherited access is dropped and direct access is kept.

### Cited Findings

Google Maps lists
- View sharing: "Send a link to view"; edit sharing: More > "Invite to edit" > "Get a link"; editor rights are governed by one toggle, "Let others edit your list", and "To remove editors, turn off 'Let others edit your list'"; sharing mode is "Private: Only you can find your lists" vs "Shared: Anyone with your link can find your lists"; "You can't share starred places" - [Maps Help, Computer](https://support.google.com/maps/answer/7280933?hl=en&co=GENIE.Platform%3DDesktop)
- Viewers see collaborators' names and profile pictures and "who has added or edited places and notes on the list"; editors can add and edit places and notes - [Maps Help, Android](https://support.google.com/maps/answer/7280933)
- Revocation is coarse: the pages describe switching edit off and switching a list to Private; they do not say whether that invalidates an old link or how to remove one specific collaborator - [Maps Help, Computer](https://support.google.com/maps/answer/7280933?hl=en&co=GENIE.Platform%3DDesktop)

Airtable shared views (link sharing)
- By default hidden fields stay hidden in the share link even in expanded records, with exceptions (grouping, calendar date, cover and stacking fields always appear); the option "Show all fields in expanded records" reveals every field - [Airtable, view share menu](https://support.airtable.com/articles/4130354023-using-the-view-share-menu-in-airtable)
- "Allow viewers to copy data out of this view" can block bulk copy and CSV download, but "cannot prevent people from copying out individual cell data"; a CSV download contains the originally shared view's records regardless of viewer filters - [Airtable, view share menu](https://support.airtable.com/articles/4130354023-using-the-view-share-menu-in-airtable)
- Anyone with the link can access the view unless a password or email-domain restriction is set (paid plans); individual email allowlists are not supported - [Airtable, view share menu](https://support.airtable.com/articles/4130354023-using-the-view-share-menu-in-airtable)
- Revocation: "Disable link" makes the current link unusable (re-enabling restores the same URL); "Generate new link" means "the previously created share link will no longer allow access" - [Airtable, view share menu](https://support.airtable.com/articles/4130354023-using-the-view-share-menu-in-airtable)
- Airtable warns that URL filter conditions on a shared view can easily be removed by viewers and should not hide private data - [Airtable, shared view URL filters](https://support.airtable.com/articles/3784973334-shared-view-url-filters) [search snippet only]

Airtable interfaces (signed-in sharing)
- Interface-only collaborators are "only invited to the interface, not the underlying base"; roles are viewer, commenter (can't edit records), editor - [Airtable, Interface Designer permissions](https://support.airtable.com/articles/2193541120-interface-designer-permissions)
- "Filters decide which records appear on a page. They don't decide who can open the page"; "Current-user filtering is the exception, it does restrict what an individual signed-in viewer can see"; a base view filter is "a convenience, not a permission" - [same](https://support.airtable.com/articles/2193541120-interface-designer-permissions)
- "Anyone with access to the base ... automatically has access to every interface built on that base"; when a collaborator's access is revoked they "immediately lose access"; for data some roles must never see, use a separate interface rather than a filter - [same](https://support.airtable.com/articles/2193541120-interface-designer-permissions)

Notion pages and databases
- Levels: Full access, Can edit, Can edit content (database pages: edit entries but not structure/views), Can create (Business/Enterprise), Can comment, Can view; a subpage "will take on the permissions of its parent page" and can be changed individually - [Notion Help](https://www.notion.com/help/sharing-and-permissions)
- Row-level access on databases is only by person or created-by property; "Permissions you assign through a person property will apply across all views of your database"; a linked view is "filtered and sorted differently without changing the original" (display only) - [Notion Help](https://www.notion.com/help/sharing-and-permissions)
- Overlap rule: "Notion respects the broadest level of access given to a user" - [Notion Help](https://www.notion.com/help/sharing-and-permissions)
- Public link: "Anyone on the web with link" can view without an account; links can be set to expire; moving a page to Private removes others' access but "the permissions granted for any subpages will remain the same" - [Notion Help](https://www.notion.com/help/sharing-and-permissions)

Pipedrive (CRM)
- Permission sets govern actions (edit, delete, import); visibility groups govern which records a user sees; each user belongs to one visibility group; higher plans allow multiple groups and sub-groups; deals admins and global admins see everything regardless of groups - [Pipedrive visibility groups](https://support.pipedrive.com/en/article/visibility-groups), [Pipedrive overview](https://support.pipedrive.com/en/article/visibility-and-permissions-overview) [search snippet only]. Sharing is by owner/group, not by tag.

Google Drive (folders as the sharing container; closest analogue to "access by label")
- When an item is moved, access inherited from former parents is removed and access added directly to the item is kept - [Workspace blog, 2020-03-27](https://workspace.google.com/blog/product-announcements/simplifying-google-drives-folder-structure-and-sharing-models)
- Worked example: "A file that is shared with user D is moved to folder Y. Users A, B and D have access to the file, but user C no longer sees it in folder X and no longer has access" - [Workspace admin help](https://knowledge.workspace.google.com/admin/drive/moving-content-from-drive-shared-folders?hl=en)
- "When a user moves a file from a shared folder to My Drive, they see a warning before the move takes effect" - [Workspace admin help](https://knowledge.workspace.google.com/admin/drive/moving-content-from-drive-shared-folders?hl=en)

### Inferences
- "Item in a shared label and a private label": the common answer (Notion, Drive, Zanzibar unions) is that access is the union of grants; the private label does not hide the item. The private label's existence on the item is a separate question (see Key question 4).
- "Label removed from an item": by analogy with Drive, access derived through that label should end at once, and only direct grants remain.
- "Shared label with children": Notion and Drive inherit downward from parent to child; Zanzibar's `tuple_to_userset` expresses exactly that. Sharing Category > Wedding would then share Wedding > Photo items too, which should be shown to the owner before confirming.
- View vs edit: Maps, Notion and Airtable all separate view and edit; Maps' secret link is view-only by default with edit as a separate invitation, which matches the planned "view-only secret link". Airtable's two revocation actions (disable vs regenerate) are a useful model for a revocable link.

### Gaps
- No product read here documents sharing by tag/label specifically (as opposed to list, folder, view or page); Gmail and Contacts labels are not shareable.
- Whether recipients of a shared Maps list see the owner's other lists or private notes: not documented on the fetched pages.
- HubSpot record-access-by-team, Contacts+ shared address books, Monica CRM: not read.

## Key question 3: Authorization models that fit "access by label" (ABAC vs ReBAC, Zanzibar, OpenFGA, SpiceDB, Drive single-parent)

### Takeaway
Relationship-based access control as defined by Zanzibar (peer-reviewed) models "share a label" directly: a label is an object, the share is a tuple `label#viewer@user`, and an item's viewers include viewers of each label it carries (tuple-to-userset, multi-valued). Attribute conditions (OpenFGA conditions, SpiceDB caveats) cover expiry of links. Google moved Drive to one parent per item plus shortcuts, and a shortcut does not share its target, which shows the cost of multi-parent inheritance; a label model is multi-parent by design, so the union semantics must be explicit and shown to the owner.

### Cited Findings
- Zanzibar ACLs are relation tuples `<object>#<relation>@<user>`, where a user may be a userset `<object>#<relation>`; Table 1 example `doc:readme#parent@folder:A#...` shows "doc:readme is in folder:A"; some relations (e.g. `parent`) "only define abstract relations between objects" that affect access via rewrite rules - [Zanzibar, sec. 2.1, Table 1](https://www.usenix.org/system/files/atc19-pang.pdf) [peer-reviewed]
- Userset rewrites: `_this`, `computed_userset` (e.g. viewer includes editor), and `tuple_to_userset`, which "fetches relation tuples matching the tupleset, and computes a userset from every fetched relation tuple", used for "look up the parent folder of the document and inherit its viewers"; expressions combine with union, intersection and exclusion; Figure 1 defines viewer = this + editor + viewers of the parent folder - [Zanzibar, sec. 2.3.1, Fig. 1](https://www.usenix.org/system/files/atc19-pang.pdf) [peer-reviewed]
- "New enemy" problem, Example A: "Alice removes Bob from the ACL of a folder; Alice then asks Charlie to move new documents to the folder ... Bob should not be able to see the new documents, but may do so if the ACL check neglects the ordering"; Example B: misapplying an old ACL to new content; solved by external consistency and a consistency token, the zookie - [Zanzibar, sec. 2.2, 2.4](https://www.usenix.org/system/files/atc19-pang.pdf) [peer-reviewed]
- Scale: used by Calendar, Cloud, Drive, Maps, Photos, YouTube; trillions of ACLs; p95 latency under 10 ms; availability above 99.999% over 3 years - [USENIX abstract](https://www.usenix.org/conference/atc19/presentation/pang) [peer-reviewed]
- OpenFGA parent-child: a `document` has a `parent` relation to `folder`, and `editor: [user] or editor from parent`; the page says editors of "any parent folder" inherit - [OpenFGA parent-child](https://openfga.dev/docs/modeling/parent-child) (exact DSL not rendered in the fetch; the model shape follows the doc's description)
- OpenFGA exclusion for blocklists: a `blocked` relation subtracted from `editor` ("but not") - [OpenFGA blocklists](https://openfga.dev/docs/modeling/blocklists)
- OpenFGA conditions add ABAC to ReBAC: a named CEL expression on a tuple, evaluated at check time, e.g. `current_time < grant_time + grant_duration`; tuple context limit 32 KB - [OpenFGA conditions](https://openfga.dev/docs/modeling/conditions)
- SpiceDB: definitions, relations, computed permissions; arrow `permission read = parent_folder->read`; operators `+`, `&`, `-` (e.g. `permission can_only_read = reader - writer`); caveats are named conditions evaluated at CheckPermission time - [SpiceDB schema](https://authzed.com/docs/spicedb/concepts/schema) (no page date shown)
- Drive single-parent: from 2020-09-30 items could no longer sit in multiple folders; shortcuts "can be used to organize content in multiple hierarchies"; moving an item now needs share access, not only read access - [Workspace blog, 2020-03-27](https://workspace.google.com/blog/product-announcements/simplifying-google-drives-folder-structure-and-sharing-models)
- Shortcut rules: "A shortcut can only have one parent"; "The ACL for a shortcut inherits the ACL of the parent"; a shortcut "breaks" if its target is deleted or the user loses access to the target - [Drive API shortcuts](https://developers.google.com/workspace/drive/api/guides/ref-single-parent)
- Migration: one location preserved per multi-location item, all other instances replaced with shortcuts, ownership and sharing preserved; timeline moved to 2022 - [Workspace Updates, 2021-12](https://workspaceupdates.googleblog.com/2021/12/timeline-update-for-migration-of-multi-location-drive-files.html) [search snippet only]; v2 `enforceSingleParent` is deprecated: "Adding files to multiple folders is no longer supported. Use shortcuts instead." - [Drive v2 parents.insert](https://developers.google.com/drive/api/reference/rest/v2/parents/insert) [search snippet only]
- Shortcuts can only be opened by people with access to the original; creating a shortcut does not share the file - [Workspace Updates, 2020-08](https://workspaceupdates.googleblog.com/2020/08/expanding-shortcuts-google-drive.html) [search snippet only]

### Inferences
- Label sharing in ReBAC terms: `label:L#viewer@user:U`, `label:L#editor@user:U`, `provider:P#label@label:L`, and `provider.viewer = owner + label->viewer`. Because `tuple_to_userset` fans out over every matching tuple, a provider in several shared labels is visible to the union of their viewers. That is the multi-parent case Drive retreated from.
- Drive's lesson, as an inference (Google's blog gives "simplify folder structure and sharing models" as the stated reason, not a detailed rationale): with many parents, the owner cannot easily predict who can see an item, and moving/removing one parent has non-local effects. Drive's answer split "where it is organized" (shortcut, no access effect) from "who can see it" (single parent). For the planned app, the equivalent split is: organizing labels never grant access; only labels the owner explicitly shared do, and the UI marks them.
- ABAC vs ReBAC: an attribute rule ("viewer may see providers whose labels include L") is easy to state but hard to audit and list; ReBAC tuples allow the reverse query "who can see provider P" and "what can user U see". Expiring secret links fit as a condition/caveat on a link grant.
- For a small private app, a full Zanzibar service is not needed; the same model fits in a relational table `share(label_id, grantee, role)` plus a join on `provider_label`, with checks evaluated in the request transaction (which avoids the new-enemy ordering problem in a single database).

### Gaps
- Google has not published (in sources read) a detailed rationale for dropping multi-parent beyond "simplifying"; the reasoning above is inference.
- OpenFGA exact DSL snippets did not render in the fetch; the parent-child shape is described in prose only.

## Key question 4: Known pitfalls (oversharing when a label is applied, renames, private notes leaking)

### Takeaway
Documented pitfalls are: inherited access that is broader than intended (Notion "broadest access wins", Drive inheritance), filters and hidden fields mistaken for security (Airtable, explicitly), links that keep working until regenerated (Airtable), and the new-enemy ordering race (Zanzibar). Rename behaviour is not documented on the pages read; stable ids separate from display names (Yelp aliases, Gmail label ids) are the observed practice.

### Cited Findings
- Oversharing through broader grants: "Notion respects the broadest level of access given to a user"; a restrictive page rule can be overridden by broader database access; link-only pages may be reachable when mentioned or linked from a more widely shared page, linked through a two-way relation, or nested inside a more widely shared page - [Notion Help](https://www.notion.com/help/sharing-and-permissions)
- Making a parent private does not reset child grants: "the permissions granted for any subpages will remain the same" - [Notion Help](https://www.notion.com/help/sharing-and-permissions)
- Filters are not access control: "a convenience, not a permission"; "Filters decide which records appear on a page. They don't decide who can open the page"; publicly shared pages can expose data with current-user filtering - [Airtable, Interface Designer permissions](https://support.airtable.com/articles/2193541120-interface-designer-permissions)
- Hidden fields can surface: grouping/date/cover/stacking fields always appear in a share link; "Show all fields in expanded records" reveals everything; individual cells can always be copied - [Airtable, view share menu](https://support.airtable.com/articles/4130354023-using-the-view-share-menu-in-airtable)
- Collaborator attribution is visible: viewers of a shared Maps list see who added or edited places and notes - [Maps Help, Android](https://support.google.com/maps/answer/7280933)
- Moving out of a shared container removes access, which Drive guards with a warning before the move - [Workspace admin help](https://knowledge.workspace.google.com/admin/drive/moving-content-from-drive-shared-folders?hl=en)
- Ordering race: removing a user and then adding content can leak the new content if the check ignores ordering (new enemy, Examples A and B) - [Zanzibar, sec. 2.2](https://www.usenix.org/system/files/atc19-pang.pdf) [peer-reviewed]
- Stable identifiers: Yelp separates alias (for search input) from display title - [Yelp developer docs](https://docs.developer.yelp.com/docs/resources-categories); Gmail labels have a separate display `name` - [users.labels reference](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.labels)

### Inferences
- Applying a shared label is a share action. A guard similar to Drive's move warning ("This will make the provider visible to N people") addresses accidental oversharing.
- Recipients should not see the owner's other labels on a provider by default; a private label name can itself be sensitive (e.g. "Too expensive"). Airtable's lesson is that this must be enforced server-side by field projection, not by hiding in the UI.
- Private notes need a separate field that is never serialized to viewers; a per-share "include notes" switch would mirror Maps, where notes on a shared list are shared content.
- Renames: if shares reference label ids, renaming does not change access; a recipient may still see the new name, which could reveal intent. Not documented by any product read; inference only.
- Children: sharing a parent facet value shares its subtree (Notion, Drive, Zanzibar inheritance); show the effective item count before confirming.

### Gaps
- No product page read documents label rename effects on recipients, or what a viewer of a shared list sees of the owner's private labels or notes.
- No public incident reports or peer-reviewed studies of label-based oversharing were searched (budget).
