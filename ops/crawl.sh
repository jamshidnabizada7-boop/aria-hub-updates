#!/bin/bash
# §1/§36 — 3-language route inventory against the candidate (via loopback Caddy).
B="http://127.0.0.1:8080"
H="Host: latest-test.myariahub.com"
ROUTES="/ /en /fa /ps /en/opportunities /fa/opportunities /ps/opportunities /en/opportunities/neurologist-permanent /fa/opportunities/neurologist-permanent /ps/opportunities/neurologist-permanent /en/deadlines /fa/deadlines /en/organizations/acbar /fa/organizations/acbar /ps/organizations/acbar /en/employers /en/employers/login /en/employers/dashboard /en/track /en/cv-builder /en/opportunity-matcher /en/blog /fa/blog /ps/blog /en/services /fa/services /ps/services /en/visas /fa/visas /en/success-stories /fa/success-stories /ps/success-stories /en/press /en/partners /fa/partners /en/advertise /en/contact /fa/contact /ps/contact /en/about /fa/about /ps/about /en/submit-opportunity /fa/submit-opportunity /en/webinar /en/interview-prep /en/letters /en/templates /sitemap.xml /robots.txt /llms.txt /rss.xml /api/health"
printf "%-4s %-9s %-6s %s\n" "CODE" "CACHE" "LANG" "ROUTE"
for r in $ROUTES; do
  lang=en; case "$r" in /fa/*|/fa) lang=fa;; /ps/*|/ps) lang=ps;; esac
  out=$(curl -s -o /dev/null -D - -w "%{http_code}" -H "$H" --max-time 30 "$B$r")
  cache=$(echo "$out" | grep -i "cf-cache-status" | head -1 | awk '{print $2}')
  code=${out: -3}
  printf "%-4s %-9s %-6s %s\n" "$code" "${cache:-—}" "$lang" "$r"
done
