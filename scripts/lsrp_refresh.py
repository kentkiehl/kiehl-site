"""Refresh the citation numbers on the LSRP page (data/lsrp.json) from OpenAlex.

Updates the total, the per-country and per-year counts and the citation counts of the listed papers. Text, downloads,
translations and the choice of papers are edited by hand in data/lsrp.json and are never touched here.
    python -m scripts.lsrp_refresh
"""
import json, time
import requests
from pipeline import config

OA = "https://api.openalex.org"
P = config.DATA / "lsrp.json"

def get(path, **params):
    if config.CONTACT_EMAIL:
        params["mailto"] = config.CONTACT_EMAIL
    r = requests.get(OA + path, params=params, timeout=60); r.raise_for_status(); time.sleep(0.2)
    return r.json()

def main():
    d = json.load(open(P)); w = d["work"]
    total = get(f"/works/{w}", select="cited_by_count")["cited_by_count"]
    cg = get("/works", filter=f"cites:{w}", group_by="authorships.countries")
    countries = [[g["key"].rsplit("/", 1)[-1], g["key_display_name"], g["count"]] for g in cg["group_by"] if g.get("key") and g["count"] > 0]
    years = sorted([g["key"], g["count"]] for g in get("/works", filter=f"cites:{w}", group_by="publication_year")["group_by"] if g["count"] > 0)
    if total < d["stats"]["cited_by"] * 0.8 or len(countries) < 20 or len(years) < 10:
        print("lsrp: implausible response, keeping existing data"); return
    for p in d["papers"]:
        try:
            p["cites"] = get(f"/works/doi:{p['doi']}", select="cited_by_count")["cited_by_count"]
        except Exception:  # noqa: BLE001
            pass
    d["papers"][1:] = sorted(d["papers"][1:], key=lambda p: -p["cites"])
    d["stats"].update(cited_by=total, citing_with_country=cg["meta"]["count"], n_countries=len(countries))
    d["countries"], d["years"], d["updated"] = sorted(countries, key=lambda c: -c[2]), years, time.strftime("%Y-%m-%d")
    json.dump(d, open(P, "w"), indent=1, ensure_ascii=False)
    print(f"lsrp: {total} citations, {len(countries)} countries")

if __name__ == "__main__":
    main()
