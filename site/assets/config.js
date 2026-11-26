/* Site configuration. After creating the GitHub repository, run:  python3 scripts/set_site_url.py <github-username> [repo-name]  */
window.SITE_CONFIG = {
  repo: "kentkiehl/kiehl-site",
  siteUrl: "https://kentkiehl.com",
  // Cloudflare Web Analytics token (cookie-free). Empty disables the beacon; see README "Analytics".
  cfAnalyticsToken: "",
  // GoatCounter site code (cookie-free visit counter; private dashboard at https://<code>.goatcounter.com). Empty disables it.
  goatcounterCode: "kkiehl",
  // Address of an embeddable donation form; empty shows only the link to mrn.org/donate (see donate.html)
  donateEmbedUrl: ""
};
