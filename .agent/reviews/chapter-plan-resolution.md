# Chapter roadmap review — #89

Scope: planning contracts only; #91–#98 are PLANNED, not implemented.

Native GPT-6.1 Sol independently inspected existing adventure/map/save source and the roadmap. Lead verified the existing map reuse risks, exact map IDs, terminal Demo beat and source novel mapping.

Antigravity was invoked with `--model gemini-4-argon-high --output-format json --mode plan --sandbox`. First filesystem review timed out after 180s with no substantive response; `chapter-agy-timeout.json` is not a PASS. A bounded retry supplied the concrete architecture proposal inline with no tool/file writes and completed in 27.1s (`chapter-agy.json`, status SUCCESS / approved_with_minor_safeguards). This is an independent review of the supplied contract, not a line-by-line implementation audit.

Consolidated findings:

| Reviewer | Finding | Resolution |
|---|---|---|
| Sol | save.set queues writes; flush has no acknowledgment, so proposed commit/load-failure behavior was ambiguous | ADR specifies prepare vs commit, last committed checkpoint, write acknowledgment/failure UI and quota/security/interruption tests in #91 |
| Gemini | Reverse adventure-to-story concurrent-tab writes unproven | Explicit blocking validation in #91/#92; test both directions, merge latest untouched sections if needed; not claimed already safe |
| Gemini | Shared root normalize/import might discard v2/future story fields | Add opaque passthrough plus migration→adventure save→story reload/export/import round-trip tests; review finding is a risk, not a confirmed present defect |
| Gemini | Disposing shared Three.js caches can break later map instances, or leak audio/lights | Adapter instance ownership, listener/audio/RAF cleanup and light assertions; full navigation fallback for unsafe factories |

Validation: roadmap map IDs and source references inspected; issue dependency DAG IDs/edges checked; JSON cache parses; build and i18n pass; documentation-only PR changes no runtime/save schema. Actual chapter implementation must satisfy its own tests before VERIFIED. No master merge.
