#!/usr/bin/env python3
"""Count downloads of every asset in every public release, with pagination."""
import json
import os
from pathlib import Path
import urllib.request


def pages(url):
    while url:
        headers = {"Accept": "application/vnd.github+json", "User-Agent": "zirgozar-downloads"}
        if os.environ.get("GH_TOKEN"):
            headers["Authorization"] = "Bearer " + os.environ["GH_TOKEN"]
        with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=60) as response:
            data = json.load(response)
            if not isinstance(data, list):
                raise ValueError("Expected a GitHub API list")
            yield from data
            url = None
            for link in response.headers.get("Link", "").split(","):
                if 'rel="next"' in link:
                    url = link.split("<", 1)[1].split(">", 1)[0]


def total_downloads(repo):
    total = 0
    releases = 0
    for release in pages(f"https://api.github.com/repos/{repo}/releases?per_page=10"):
        if release["draft"]:
            continue
        releases += 1
        for asset in release["assets"]:
            count = asset["download_count"]
            if type(count) is not int or count < 0:
                raise ValueError("Invalid download count")
            total += count
    if not releases:
        raise ValueError("No public releases; keeping the previous badge")
    return total


def badge(total):
    value = f"{total:,}"
    right = max(55, 18 + len(value) * 9)
    width = 102 + right
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="28" role="img" aria-label="Total downloads: {value}">
  <title>Total downloads: {value}</title>
  <g shape-rendering="crispEdges"><path fill="#555" d="M0 0h102v28H0z"/><path fill="#0ea5e9" d="M102 0h{right}v28H102z"/></g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="51" y="18">DOWNLOADS</text><text x="{102 + right / 2}" y="18" font-weight="bold">{value}</text>
  </g>
</svg>
'''


if __name__ == "__main__":
    total = total_downloads(os.environ.get("GITHUB_REPOSITORY", "dreamboxone/zirgozar"))
    target = Path(__file__).resolve().parents[1] / "badges" / "downloads.svg"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(badge(total), encoding="utf-8")
    print(f"Total downloads: {total}")
