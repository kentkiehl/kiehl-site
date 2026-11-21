# Kiehl Lab website — notes for Claude Code

Static GitHub Pages site for Kent A. Kiehl (Mind Research Network / University of New Mexico), built November 2026 by
duplicating the Jakubzick Lab site (github.com/claudjak/Jakubzick_lab), itself a copy of the CANlab site
(github.com/torwager/canlab; read its `site_plan_claude.txt` for the shared design system, data schemas and pipeline).

## Decisions
- Branded as the Kiehl Lab with Kent Kiehl as PI (owner's decision, 21 Nov 2026; the first build was a personal site).
  Home page follows the Jakubzick layout: title + lede + highlights carousel, then tiles beside the hero canvas. Nav: Research ·
  Publications · Books · Media & talks · News · People · About ▾ (biography & CV, resources, network, bibliometrics, about this site) · Contact.
  `join.html` was replaced by `contact.html`; `book.html`, `media.html`, `about-kent.html`, `resources.html` are new and
  render from `data/books.json`, `media.json`, `cv.json`, `resources.json`.
- Built first at a github.io address; kentkiehl.com (WordPress, with a Give donation page) is untouched until the owner decides.
- Brand accent is cherry red (`--accent*` in app.css); amber is only the activation glow. Hero = mobile MRI truck on a US map
  (cities are illustrative; Albuquerque is home base). Carousel slides (`data/highlights.json`) use original illustrated panels:
  the owner asked for a photo of Morgan Freeman / TV stills, which were not added (photos of public figures and broadcast
  stills are not ours to publish); slides accept an `img` the owner supplies with rights. The CrimeCon panel is our own
  design, not CrimeCon artwork.
- Papers: imported from the CV (docx -> pandoc html -> `scripts/import_cv.py`), not from PubMed, because the build machine
  had no network. Manuscripts in submission are excluded. Trainee authors (bold in the CV) are kept in `trainee_authors`.
  The daily workflow adds abstracts (`scripts/enrich.py`) and citation counts.
- Tags: `pipeline/taxonomy.json` (clinical/forensic neuroscience vocabulary); first pass by title rules
  (`scripts/tag_by_rules.py`, `tag_source: "rules"`). A proper LLM pass from abstracts is still to do once abstracts exist.
- Not published on purpose: grant dollar totals, pending grants, mobile phone number, percentile scores of trainees,
  "currently at ..." statements about former trainees (may be stale), YouTube view counts.
- No photos yet; initials placeholders are used. Do not download photos of people from the web; the owner supplies them.

## Working
- `python3 -m pipeline.build_site`; preview with `python3 -m http.server 8765 --directory site`.
- Site address lives in pipeline/config.py, site/assets/config.js and the page heads: change with `scripts/set_site_url.py`.
- Bump `?v=` on app.css/app.js/layout.js/hero.js when they change.
