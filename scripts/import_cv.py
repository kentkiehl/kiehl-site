"""Build data/papers.json from the publication list in Kent Kiehl's CV (HTML made with
`pandoc kiehl_cv_2026.docx -t html --wrap=none -o cv.html`).

Usage: python3 scripts/import_cv.py path/to/cv.html
Journal articles, book chapters and books are imported; manuscripts in submission are skipped.
Hand edits to tags/summary in an existing data/papers.json are kept (matched on id).
"""
import html, json, re, sys, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
src = Path(sys.argv[1]).read_text()
lines = src.split("\n")

def find(pat, start=0):
    for i in range(start, len(lines)):
        if re.search(pat, lines[i]):
            return i
    raise SystemExit("section not found: " + pat)

i_pub = find(r"PEER-REVIEWED PUBLICATIONS")
i_sub = find(r"Manuscripts in submission", i_pub)
i_chap = find(r"BOOK CHAPTERS AND POPULAR PRESS", i_sub)
i_ed = find(r"EDITED BOOKS", i_chap)
i_books = find(r">BOOKS<|^BOOKS|<strong>BOOKS", i_ed)
i_pres = find(r"SCIENTIFIC PRESENTATIONS", i_books)

def text(s):
    s = re.sub(r"<[^>]+>", "", s)
    return re.sub(r"\s+", " ", html.unescape(s).replace("\xa0", " ")).strip()

def entries(a, b):
    out = []
    for ln in lines[a:b]:
        m = re.search(r"<p>(.*)</p>", ln)
        if m and re.search(r"\(\s*(19|20)\d\d[a-z]?(,[^)]*)?\s*\)|\(in press\)|\(Editors; \d{4}\)", text(m.group(1))) and re.match(r"[A-Za-z][\w'’ \-]+,\s*[A-Z]", text(m.group(1))):
            out.append(m.group(1))
    return out

def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]", "", s.lower())

STOP = {"a", "an", "the", "of", "in", "on", "and", "for", "to", "is", "are", "with", "by", "from", "at", "as", "do", "does"}

def parse_authors(a):
    a = re.sub(r"\s*\(Editors?;?\s*$", "", a)
    a = a.replace("*", "").replace("&", ",").replace(" and ", ", ")
    a = re.sub(r"((?:\b[A-Z]\.\s?)+)\s+(?=[A-Z][a-z])", lambda m: m.group(1).strip() + ", ", a)   # "A. Forster" -> "A., Forster"
    a = re.sub(r"\b([A-Z][a-z]+) ((?:[A-Z]\.)+[A-Z]?\.?)(?=,|$|\s)", r"\1, \2", a)              # "Calhoun V.D" -> "Calhoun, V.D"
    toks = [t.strip() for t in a.split(",") if t.strip()]
    out, i = [], 0
    while i < len(toks):
        sur = toks[i]
        if i + 1 < len(toks) and re.fullmatch(r"(?:[A-Z][a-z]?\.?[\s-]*){1,5}(?:Jr\.?|III|II)?", toks[i + 1]):
            ini = re.sub(r"\s+", " ", toks[i + 1]).strip()
            ini = re.sub(r"([A-Z])\.?\s*", r"\1. ", ini).strip()
            out.append(f"{sur}, {ini}")
            i += 2
        else:
            out.append(sur)
            i += 1
    return out

def short(a):
    if "," not in a:
        return a
    sur, ini = a.split(",", 1)
    return f"{sur.strip()} {re.sub(r'[^A-Z]', '', ini)}"

def parse(raw, kind):
    bold = [text(x) for x in re.findall(r"<strong>(.*?)</strong>", raw)]
    ems = [text(x) for x in re.findall(r"<em>(.*?)</em>", raw)]
    t = text(raw)
    m = re.search(r"\(\s*((?:19|20)\d\d)[a-z]?(?:,[^)]*)?\s*\)\.?|\((in press)\)\.?|\(Editors; (\d{4})\)\.?", t)
    year = int(m.group(1) or m.group(3)) if (m.group(1) or m.group(3)) else None
    authors = parse_authors(t[:m.start()].strip().rstrip(".").strip())
    rest = t[m.end():].strip()
    doi = re.search(r"(?:doi\.org/|doi:\s*|DOI:\s*)(10\.\d{4,9}/[^\s;,]+)", rest)
    doi = doi.group(1).rstrip(".") if doi else None
    pmid = re.search(r"PMID:?\s*(\d{6,9})", rest)
    pmcid = re.search(r"PMCID:?\s*(PMC\d{6,9})", rest)
    body = re.split(r"\s*(?:https?://|doi:|DOI:|PMID|PMCID)", rest)[0].strip()
    journal = vol = issue = pages = None
    jem = [e for e in ems if not re.fullmatch(r"[\d\s()\-–,.]+", e)]
    if kind == "article" and jem and jem[0].rstrip(".,") in body:
        j = jem[0]
        k = body.find(j.rstrip(".,"))
        title, tail = body[:k].strip(), body[k + len(j.rstrip(".,")):].lstrip(".,").strip()
        journal = j.rstrip(".,")
        mv = re.match(r"(\d+[A-Za-z]?)\s*(?:\(([^)]+)\))?\s*,?\s*([A-Za-z]?\d[\w\-–.]*)?", tail)
        if mv:
            vol, issue, pages = mv.group(1), mv.group(2), (mv.group(3) or "").rstrip(".") or None
    else:
        parts = re.split(r"(?<=[.?!])\s+(?=[A-Z“\"])", body, maxsplit=1)
        title, tail = parts[0], (parts[1] if len(parts) > 1 else "")
        if kind == "article":
            mj = re.match(r"(.+?),\s*(\d+)\s*(?:\(([^)]+)\))?,?\s*([\w\-–]+)?", tail)
            if mj:
                journal, vol, issue, pages = mj.group(1), mj.group(2), mj.group(3), mj.group(4)
            else:
                journal = tail.rstrip(".") or None
        else:
            journal = tail.rstrip(".") or None
    title = title.strip().rstrip(".").strip() if not title.strip().endswith("?") else title.strip()
    words = [w for w in re.findall(r"[A-Za-z0-9]+", title.lower()) if w not in STOP]
    pid = f"{slug(authors[0].split(',')[0]) if authors else 'anon'}{year or 'inpress'}{slug(words[0]) if words else ''}"
    links = []
    if doi:
        links.append({"type": "publisher", "label": "Publisher", "url": "https://doi.org/" + doi})
    if pmcid:
        links.append({"type": "fulltext", "label": "Free full text (PMC)", "url": f"https://pmc.ncbi.nlm.nih.gov/articles/{pmcid.group(1)}/"})
    for u in re.findall(r"https?://[^\s]+", rest):
        if "doi.org" not in u and "pubmed" not in u and "pmc.ncbi" not in u and kind != "article":
            links.append({"type": "publisher", "label": "Book page", "url": u.rstrip(".")})
    sh = [short(a) for a in authors]
    cit = f"{', '.join(sh)}. {title}{'' if title.endswith('?') else '.'} {journal or ''}. {year or 'In press'}"
    if vol:
        cit += f";{vol}{'(' + issue + ')' if issue else ''}{':' + pages if pages else ''}"
    cit += "." + (f" doi:{doi}" if doi else "")
    return {
        "id": pid, "title": title, "authors": authors, "authors_short": sh, "authors_truncated": False,
        "trainee_authors": bold, "year": year, "date": f"{year}" if year else "", "status": "published" if year else "in_press", "kind": kind,
        "journal": journal, "journal_full": journal, "volume": vol, "issue": issue, "pages": pages,
        "doi": doi, "pmid": pmid.group(1) if pmid else None, "pmcid": pmcid.group(1) if pmcid else None, "openalex_id": None,
        "abstract": "", "abstract_source": None, "cited_by_count": None, "oa_url": None,
        "landing_url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid.group(1)}/" if pmid else None,
        "keywords": [], "links": links, "has_pdf": False, "citation": cit, "citation_original": t, "commentaries": [],
        "tags": {}, "summary": "", "key_finding": "", "free_keywords": [], "date_added": "", "source": "cv-2026",
    }

recs = [parse(e, "article") for e in entries(i_pub, i_sub)]
recs += [parse(e, "chapter") for e in entries(i_chap, i_ed)]
recs += [parse(e, "book") for e in entries(i_ed, i_pres)]
# entries the generic parser cannot read correctly
OVERRIDES = {
    "anderson2019affective": {"title": "Affective and interpersonal psychopathic traits associated with reduced corpus callosum volume among male inmates – retraction", "journal": "Psychological Medicine", "journal_full": "Psychological Medicine", "volume": "49", "issue": "8", "pages": "1400", "kind": "retraction", "note": "Senior author note: A data error was found and corrected by the team."},
    "kiehl2014psychopathy": {"journal": "Scholarpedia", "journal_full": "Scholarpedia", "links": [{"type": "publisher", "label": "Scholarpedia", "url": "http://www.scholarpedia.org/article/Psychopathy"}]},
    "kiehl2013handbook": {"title": "Handbook on Psychopathy and Law", "journal": "Oxford University Press, New York", "journal_full": "Oxford University Press, New York", "editors": True},
    "kiehl2014psychopath": {"journal": "Crown Publishing (Random House)", "journal_full": "Crown Publishing, a division of Random House"},
}
seen = {}
for r in recs:
    r.update(OVERRIDES.get(r["id"], {}))
    base, n = r["id"], 2
    while r["id"] in seen:
        r["id"] = f"{base}{n}"; n += 1
    seen[r["id"]] = r
out = ROOT / "data" / "papers.json"
if out.exists():
    old = {r["id"]: r for r in json.load(open(out))}
    for r in recs:
        o = old.get(r["id"])
        if o and o.get("source") == "cv-2026":
            for k in ("tags", "summary", "key_finding", "free_keywords", "abstract", "abstract_source", "cited_by_count", "oa_url", "openalex_id", "date_added"):
                if o.get(k):
                    r[k] = o[k]
json.dump(recs, open(out, "w"), ensure_ascii=False, indent=1)
from collections import Counter
print(len(recs), Counter(r["kind"] for r in recs), "no journal:", sum(1 for r in recs if r["kind"] == "article" and not r["journal"]), "doi:", sum(1 for r in recs if r["doi"]), "pmid:", sum(1 for r in recs if r["pmid"]))
