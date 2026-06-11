import requests
import xml.etree.ElementTree as ET
import os
from datetime import datetime
from urllib.parse import quote

COMPETITORS = [
    "aleatec GmbH",
    "Aumüller",
    "Simon Protec",
    "DH mechatronic",
]

def fetch_google_news(company):
    url = (
        f"https://news.google.com/rss/search"
        f"?q={quote(company)}&hl=de&gl=DE&ceid=DE:de"
    )
    try:
        resp = requests.get(url, timeout=15, headers={
            "User-Agent": "Mozilla/5.0 (compatible; CompetitorBot/1.0)"
        })
        resp.raise_for_status()
        root = ET.fromstring(resp.content)
        items = []
        for item in root.findall(".//item")[:5]:
            title = item.findtext("title", "").strip()
            link = item.findtext("link", "").strip()
            pub_date = item.findtext("pubDate", "").strip()
            source = item.findtext("source", "").strip()
            if title and link:
                items.append({
                    "title": title,
                    "link": link,
                    "pub_date": pub_date,
                    "source": source,
                })
        return items
    except Exception as e:
        return [{"error": str(e)}]


def ensure_label(token, repo):
    url = f"https://api.github.com/repos/{repo}/labels"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
    }
    # Check if label exists
    resp = requests.get(url, headers=headers)
    existing = [l["name"] for l in resp.json()] if resp.ok else []
    if "konkurrenz-update" not in existing:
        requests.post(url, headers=headers, json={
            "name": "konkurrenz-update",
            "color": "d93f0b",
            "description": "Automatische wöchentliche Konkurrenz-Analyse",
        })


def create_issue(token, repo, title, body):
    url = f"https://api.github.com/repos/{repo}/issues"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
    }
    resp = requests.post(url, headers=headers, json={
        "title": title,
        "body": body,
        "labels": ["konkurrenz-update"],
    })
    resp.raise_for_status()
    return resp.json()


def build_body(results, date_str, week_str):
    lines = [
        f"# Konkurrenz-Update – KW {week_str} ({date_str})",
        "",
        "Automatisch zusammengestellte Neuigkeiten der Konkurrenz via Google News.",
        "",
        "---",
        "",
    ]
    for company, items in results.items():
        lines.append(f"## {company}")
        lines.append("")
        if not items:
            lines.append("_Keine aktuellen Neuigkeiten gefunden._")
        elif "error" in items[0]:
            lines.append(f"_Fehler beim Abrufen der Daten: {items[0]['error']}_")
        else:
            for item in items:
                source_tag = f" · {item['source']}" if item.get("source") else ""
                date_tag = f" · {item['pub_date'][:16]}" if item.get("pub_date") else ""
                lines.append(f"- **[{item['title']}]({item['link']})**")
                if source_tag or date_tag:
                    lines.append(f"  _{source_tag.lstrip(' · ')}{date_tag}_")
                lines.append("")
        lines.append("---")
        lines.append("")
    lines.append(f"_Automatisch erstellt am {date_str} um 09:00 Uhr (CEST)_")
    return "\n".join(lines)


def main():
    token = os.environ["GITHUB_TOKEN"]
    repo = os.environ["GITHUB_REPOSITORY"]

    now = datetime.now()
    date_str = now.strftime("%d.%m.%Y")
    week_str = now.strftime("%V")

    results = {}
    for company in COMPETITORS:
        print(f"Suche Neuigkeiten für: {company}")
        results[company] = fetch_google_news(company)

    body = build_body(results, date_str, week_str)
    title = f"Konkurrenz-Update KW{week_str} – {date_str}"

    ensure_label(token, repo)
    issue = create_issue(token, repo, title, body)
    print(f"Issue erstellt: {issue['html_url']}")


if __name__ == "__main__":
    main()
