"""Point the site at its real address after the GitHub repository exists.

    python3 scripts/set_site_url.py <github-username> [repo-name]      -> https://<username>.github.io/<repo-name>
    python3 scripts/set_site_url.py --domain kentkiehl.com [<github-username> [repo-name]]   -> https://kentkiehl.com (also writes site/CNAME)

Rewrites the placeholder (or the previous address) in the HTML pages, site/assets/config.js and pipeline/config.py.
"""
import re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
args = sys.argv[1:]
domain = None
if args[:1] == ["--domain"]:
    domain, args = args[1], args[2:]
user = args[0] if args else None
repo = args[1] if len(args) > 1 else "kiehl-site"
if not (user or domain):
    sys.exit(__doc__)
new_url = f"https://{domain}" if domain else f"https://{user}.github.io/{repo}"
cfg = (ROOT / "pipeline" / "config.py").read_text()
old_url = re.search(r'or "(https://[^"]+)"\)\.rstrip', cfg).group(1)
old_repo = re.search(r'repo: "([^"]+)"', (ROOT / "site" / "assets" / "config.js").read_text()).group(1)
files = list((ROOT / "site").glob("*.html")) + [ROOT / "site" / "assets" / "config.js", ROOT / "site" / "assets" / "layout.js", ROOT / "pipeline" / "config.py", ROOT / "README.md"]
n = 0
for f in files:
    s = f.read_text(); t = s.replace(old_url, new_url)
    if user:
        t = t.replace(old_repo, f"{user}/{repo}")
    if t != s:
        f.write_text(t); n += 1
if domain:
    (ROOT / "site" / "CNAME").write_text(domain + "\n")
print(f"{old_url} -> {new_url} in {n} files. Now run: python3 -m pipeline.build_site")
