# Site compatibility

ApplyProof supports sites only after repeatable compatibility testing. It does not claim universal ATS support, and a form that happens to work is not automatically an advertised integration.

## Supported-site matrix

| Environment                    | Status                           | Evidence                                                                                                                                                   |
| ------------------------------ | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Northstar Labs local demo      | Supported                        | Complete scan, deterministic fill, resume attachment, inline drafting, existing-value protection, and no-submit tests                                      |
| Ordinary semantic HTML fixture | Compatibility baseline only      | Regression tests cover opaque IDs, labels, names, input types, `autocomplete`, options, limited surrounding question text, and client-rendered later steps |
| Greenhouse                     | Not yet supported                | No end-to-end site pilot completed                                                                                                                         |
| Lever                          | Not yet supported                | No end-to-end site pilot completed                                                                                                                         |
| Workday                        | Not yet supported                | No end-to-end site pilot completed                                                                                                                         |
| Other application or ATS sites | Not supported unless listed here | Compatibility has not been established                                                                                                                     |

The ordinary HTML fixture is engineering evidence for common browser primitives, not a claim that a named third-party site works.

## Capability matrix

| Capability                                                      | Current behavior                                                                                                           |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Text, email, phone, URL, date, textarea, and native select      | Scanned; high-confidence profile mappings can fill after a user action                                                     |
| Native radio and checkbox groups                                | Scanned and filled when a verified mapping and matching option exist                                                       |
| Accessible ARIA textbox, combobox, listbox, radio, and checkbox | Scanned; filling complex site-specific widgets is only partially supported                                                 |
| Opaque generated IDs                                            | Classification also uses labels, names, `autocomplete`, input types, options, and limited question-container text          |
| Client-rendered or multi-step fields                            | A later user-initiated scan discovers the current step; ApplyProof never clicks Next or Continue                           |
| Cover-letter textareas                                          | Uses bounded page JD context and saved-resume evidence; asks for pasted JD when extraction is unavailable                  |
| Existing values                                                 | Preserved; generated open answers change only after explicit regeneration                                                  |
| Resume upload                                                   | Ordinary same-document file inputs are supported after an explicit user action; custom uploaders may require manual upload |
| Same-origin and cross-origin iframes                            | Not scanned in the current pilot                                                                                           |
| Site-owned shadow DOM                                           | Not scanned in the current pilot                                                                                           |
| Navigation and final submission                                 | Never performed by ApplyProof                                                                                              |

## Access model

The extension uses Chrome's `activeTab` and `scripting` permissions. Clicking the toolbar action grants temporary access to that tab and explicitly opens its side panel; the automatic side-panel action behavior is disabled because it does not grant `activeTab` access. ApplyProof injects its page helper only after that user gesture and Scan & Autofill. It has no persistent permission for online job sites and no `<all_urls>` permission. Persistent host access is limited to the two local development origins.

Normalized field metadata may include the field label, ID, name, input type, `autocomplete`, available option labels, and up to 500 characters of text from a recognized question container. The scan may also include company, role, and up to 12,000 characters from `JobPosting` structured data or an explicit job-description container. Denied sensitive fields are excluded, including their values. The scanner does not collect full-page HTML.

## Pilot exit criteria

A named site can move to Supported only after a repeatable fixture and browser test demonstrate:

1. useful labels and high-confidence semantic classification;
2. deterministic fill without overwriting existing values;
3. safe handling of relevant native and custom controls;
4. inline drafting and live character-limit behavior where applicable;
5. an explicit resume-upload outcome or documented manual fallback;
6. multi-step behavior that leaves navigation to the user; and
7. no automatic Continue, Next, or Submit action.
