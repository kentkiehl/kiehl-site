"""Fill in abstracts, dates, keywords and PMC ids from PubMed for records that came from the CV without them.

Run from the repository root (GitHub Actions does this on every daily run; it is a no-op once everything is filled):
    python -m scripts.enrich
"""
import json
from pipeline import config, pubmed

def main():
    recs = json.load(open(config.PAPERS))
    todo = {r["pmid"]: r for r in recs if r.get("pmid") and not r.get("abstract") and not r.get("enriched")}
    if not todo:
        print("enrich: nothing to do"); return
    n = 0
    for rec in pubmed.fetch(list(todo)):
        r = todo.get(rec["pmid"])
        if not r:
            continue
        r["enriched"] = True
        if rec.get("abstract"):
            r["abstract"] = rec["abstract"]; r["abstract_source"] = "pubmed"; n += 1
        if rec.get("date") and len(r.get("date") or "") <= 4:
            r["date"] = rec["date"]
        if rec.get("keywords") and not r.get("keywords"):
            r["keywords"] = rec["keywords"][:10]
        if rec.get("pmcid") and not r.get("pmcid"):
            r["pmcid"] = rec["pmcid"]
            r.setdefault("links", []).append({"type": "fulltext", "label": "Free full text (PMC)", "url": f"https://pmc.ncbi.nlm.nih.gov/articles/{rec['pmcid']}/"})
        if rec.get("doi") and not r.get("doi"):
            r["doi"] = rec["doi"]
            r.setdefault("links", []).insert(0, {"type": "publisher", "label": "Publisher", "url": "https://doi.org/" + rec["doi"]})
    json.dump(recs, open(config.PAPERS, "w"), ensure_ascii=False, indent=1)
    print(f"enrich: abstracts added for {n} of {len(todo)} records")

if __name__ == "__main__":
    main()
