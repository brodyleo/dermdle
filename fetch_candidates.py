#!/usr/bin/env python3
"""
fetch_candidates.py — pull candidate clinical images from Wikimedia Commons
categories so they can be reviewed before being embedded in Dermdle.

Unlike the earlier fetcher, this does NOT pick an image for you. It downloads
several candidates per condition into ./candidates/ as plain JPGs. You then
look at them, and send the good ones on for embedding.

Usage:
    python3 fetch_candidates.py

Output:
    candidates/psoriasis_01.jpg, psoriasis_02.jpg, ...
    candidates/bullous_pemphigoid_01.jpg, ...
    candidates/MANIFEST.txt   <- filenames, licenses, authors, source URLs
"""

import json
import os
import re
import urllib.parse
import urllib.request

API = "https://commons.wikimedia.org/w/api.php"
UA = "Dermdle-image-sourcing/1.0 (educational project; contact via project owner)"
OUT = "candidates"
PER_CONDITION = 6
MAX_WIDTH = 1200

# Commons categories to pull from, keyed by the label used in filenames.
CATEGORIES = {
    "psoriasis": "Category:Psoriasis",
    "bullous_pemphigoid": "Category:Bullous pemphigoid",
}


def api(params):
    params = dict(params, format="json")
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def list_files(category, limit=40):
    data = api({
        "action": "query",
        "list": "categorymembers",
        "cmtitle": category,
        "cmtype": "file",
        "cmlimit": limit,
    })
    return [m["title"] for m in data.get("query", {}).get("categorymembers", [])]


def file_info(title):
    data = api({
        "action": "query",
        "titles": title,
        "prop": "imageinfo",
        "iiprop": "url|extmetadata|size",
        "iiurlwidth": MAX_WIDTH,
    })
    pages = data.get("query", {}).get("pages", {})
    for page in pages.values():
        info = (page.get("imageinfo") or [None])[0]
        if not info:
            continue
        meta = info.get("extmetadata", {})

        def get(key):
            v = meta.get(key, {}).get("value", "")
            return re.sub(r"<[^>]+>", "", v).strip()

        return {
            "title": title,
            "url": info.get("thumburl") or info.get("url"),
            "descriptionurl": info.get("descriptionurl", ""),
            "license": get("LicenseShortName"),
            "artist": get("Artist") or "Wikimedia Commons contributor",
            "description": get("ImageDescription")[:300],
        }
    return None


# Skip scans of antique atlases, diagrams, and micrographs — we want photos.
SKIP = re.compile(
    r"(1[6-9]\d\d|19[0-4]\d|atlas|plate |wellcome|micrograph|histolog|"
    r"diagram|chart|logo|icon|\.svg|\.tif|\.pdf|\.webm|\.ogv)", re.I)

ALLOWED_LICENSE = re.compile(r"(CC BY|CC0|Public domain)", re.I)


def main():
    os.makedirs(OUT, exist_ok=True)
    manifest = []

    for label, category in CATEGORIES.items():
        print(f"\n=== {category} ===")
        try:
            titles = list_files(category)
        except Exception as e:
            print(f"  ! could not list {category}: {e}")
            continue

        saved = 0
        for title in titles:
            if saved >= PER_CONDITION:
                break
            if SKIP.search(title):
                continue
            try:
                info = file_info(title)
            except Exception as e:
                print(f"  ! {title}: {e}")
                continue
            if not info or not info["url"]:
                continue
            if not ALLOWED_LICENSE.search(info["license"] or ""):
                print(f"  - skip (license: {info['license'] or 'unknown'}) {title}")
                continue

            saved += 1
            fname = f"{label}_{saved:02d}.jpg"
            path = os.path.join(OUT, fname)
            try:
                req = urllib.request.Request(
                    info["url"], headers={"User-Agent": UA})
                with urllib.request.urlopen(req, timeout=60) as r, \
                        open(path, "wb") as f:
                    f.write(r.read())
            except Exception as e:
                print(f"  ! download failed {title}: {e}")
                saved -= 1
                continue

            kb = os.path.getsize(path) // 1024
            print(f"  + {fname}  ({kb} KB)  {info['license']}")
            manifest.append(
                f"{fname}\n"
                f"    title:   {info['title']}\n"
                f"    license: {info['license']}\n"
                f"    author:  {info['artist']}\n"
                f"    source:  {info['descriptionurl']}\n"
                f"    descr:   {info['description']}\n")

    with open(os.path.join(OUT, "MANIFEST.txt"), "w") as f:
        f.write("\n".join(manifest))

    print(f"\nDone. {len(manifest)} candidates in ./{OUT}/")
    print("Open the folder and look through them:  open candidates")


if __name__ == "__main__":
    main()
