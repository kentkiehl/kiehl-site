"""World map of who cites the lab (data/citations_geo.json), from OpenAlex. Runs on the 1st of each month.

For every paper that cites any work by the principal investigator, record ONE country: that of the corresponding
("primary contact") author's institution; if OpenAlex has no corresponding author for the paper, the first author's;
failing that, the first author with a known institution. A paper citing several of the lab's papers is counted once.

Works without an API key (page-based listing, batches kept under OpenAlex's 10,000-result limit); with OPENALEX_API_KEY
set it uses the same route on the key's own budget. If anything looks wrong the existing file is kept.
    python -m scripts.citations_geo
"""
import json, time
import requests
from pipeline import config

OA = "https://api.openalex.org"
AUTHOR = (config.OPENALEX_AUTHOR_IDS or ["A5015647568"])[0]     # Kent A. Kiehl
P = config.DATA / "citations_geo.json"

def get(path, **params):
    if config.CONTACT_EMAIL:
        params["mailto"] = config.CONTACT_EMAIL
    if config.OPENALEX_API_KEY:
        params["api_key"] = config.OPENALEX_API_KEY
    for attempt in range(4):
        r = requests.get(OA + path, params=params, timeout=90)
        if r.ok:
            time.sleep(0.15); return r.json()
        if r.status_code != 429 and r.status_code < 500:
            r.raise_for_status()
        time.sleep(3 * (attempt + 1))
    r.raise_for_status()

def pick(work, how):
    A = work.get("authorships") or []
    for kind, test in (("corresponding", lambda a: a.get("is_corresponding")), ("first", lambda a: a.get("author_position") == "first"), ("other", lambda a: True)):
        for a in A:
            if test(a) and a.get("countries"):
                how[kind] += 1; return a["countries"][0]
    how["none"] += 1
    return None

def main():
    works = []
    for page in range(1, 6):
        res = get("/works", filter=f"author.id:{AUTHOR}", select="id,cited_by_count", **{"per-page": 200, "page": page})["results"]
        works += res
        if len(res) < 200: break
    cited = sorted((w for w in works if w["cited_by_count"] > 0), key=lambda w: -w["cited_by_count"])
    batches, cur, tot = [], [], 0
    for w in cited:                                    # keep each batch under the 10,000-result paging limit
        if cur and (tot + w["cited_by_count"] > 9000 or len(cur) >= 50):
            batches.append(cur); cur, tot = [], 0
        cur.append(w["id"].rsplit("/", 1)[-1]); tot += w["cited_by_count"]
    if cur: batches.append(cur)
    seen, how = {}, {"corresponding": 0, "first": 0, "other": 0, "none": 0}
    for b in batches:
        for page in range(1, 51):
            res = get("/works", filter="cites:" + "|".join(b), select="id,authorships", **{"per-page": 200, "page": page})["results"]
            for w in res:
                if w["id"] not in seen:
                    seen[w["id"]] = pick(w, how)
            if len(res) < 200: break
    counts = {}
    for cc in seen.values():
        if cc: counts[cc] = counts.get(cc, 0) + 1
    old = json.load(open(P)) if P.exists() else None
    if len(seen) < 5000 or len(counts) < 40 or (old and len(seen) < old["stats"]["citing_papers"] * 0.9):
        print(f"citations_geo: implausible result ({len(seen)} papers, {len(counts)} countries), keeping existing data"); return
    out = {"updated": time.strftime("%Y-%m-%d"), "source": "OpenAlex", "author": AUTHOR,
           "stats": {"works": len(works), "works_cited": len(cited), "citing_papers": len(seen), "with_country": sum(counts.values()), "n_countries": len(counts), "how": how},
           "countries": sorted(([cc, n] for cc, n in counts.items()), key=lambda c: -c[1])}
    json.dump(out, open(P, "w"), indent=1)
    print(f"citations_geo: {len(seen)} citing papers, {len(counts)} countries")

if __name__ == "__main__":
    main()
