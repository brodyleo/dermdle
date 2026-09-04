#!/usr/bin/env python3
"""
fetch_batch.py — pull candidate clinical images from Wikimedia Commons for the
whole common-mode pool in one run.

For each diagnosis it searches Commons (and reads relevant categories), keeps
only openly-licensed photographs, and downloads a handful of candidates so a
human can pick the good one. It does NOT choose for you.

Usage:
    python3 fetch_batch.py                # everything
    python3 fetch_batch.py tinea_manuum   # just one or a few

Output:
    candidates/<diagnosis>/01.jpg, 02.jpg, ...
    candidates/MANIFEST.txt   <- license, author and source URL for every file
"""

import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API = "https://commons.wikimedia.org/w/api.php"
UA = "Dermdle-image-sourcing/1.1 (medical education project)"
OUT = "candidates"
PER_CONDITION = 5      # how many candidates to keep per diagnosis
SEARCH_DEPTH = 25      # how many Commons hits to consider before filtering
THUMB_WIDTH = 1200

# Each entry: search phrases first, then any category worth sweeping.
CONDITIONS = {
    "psoriasis":                 (["psoriasis plaque elbow", "psoriasis knee scale"],
                                  ["Category:Psoriasis"]),
    "bullous_pemphigoid":        (["bullous pemphigoid blister"],
                                  ["Category:Bullous pemphigoid"]),
    "erythema_annulare_centrifugum": (["erythema annulare centrifugum"], []),
    "keratosis_pilaris":         (["keratosis pilaris"],
                                  ["Category:Keratosis pilaris"]),
    "rosacea_papulopustular":    (["papulopustular rosacea", "rosacea face"],
                                  ["Category:Rosacea"]),
    "perioral_dermatitis":       (["perioral dermatitis"], []),
    "pilar_cyst":                (["pilar cyst", "trichilemmal cyst"], []),
    "hidradenitis_suppurativa":  (["hidradenitis suppurativa"],
                                  ["Category:Hidradenitis suppurativa"]),
    "erythema_migrans_lyme":     (["erythema migrans", "Lyme disease rash"],
                                  ["Category:Erythema migrans"]),
    "tinea_manuum":              (["tinea manuum", "tinea hand"], []),
    "dyshidrotic_eczema":        (["dyshidrotic eczema", "pompholyx"],
                                  ["Category:Dyshidrosis"]),
    "tinea_versicolor":          (["pityriasis versicolor", "tinea versicolor"],
                                  ["Category:Tinea versicolor"]),
    "seborrheic_dermatitis_face": (["seborrheic dermatitis face",
                                    "seborrhoeic dermatitis"],
                                  ["Category:Seborrhoeic dermatitis"]),
    "irritant_contact_dermatitis": (["irritant contact dermatitis"],
                                    ["Category:Contact dermatitis"]),
    "allergic_contact_dermatitis": (["allergic contact dermatitis",
                                     "nickel dermatitis", "poison ivy rash"],
                                    ["Category:Contact dermatitis"]),
    "alopecia_areata":           (["alopecia areata"],
                                  ["Category:Alopecia areata"]),
    "androgenetic_alopecia":     (["androgenetic alopecia",
                                   "male pattern baldness"], []),
    "telogen_effluvium":         (["telogen effluvium", "hair shedding"], []),
    "seborrheic_keratosis":      (["seborrheic keratosis"],
                                  ["Category:Seborrheic keratosis"]),
    "verruca_vulgaris":          (["verruca vulgaris", "common wart hand"],
                                  ["Category:Warts"]),
    "molluscum_contagiosum":     (["molluscum contagiosum"],
                                  ["Category:Molluscum contagiosum"]),
}

# Antique atlas scans, drawings, micrographs and non-photos are not usable.
SKIP = re.compile(
    r"(1[5-9]\d\d|19[0-4]\d|atlas|plate |wellcome|micrograph|histol|"
    r"pathol|diagram|chart|drawing|illustration|engraving|logo|icon|map|"
    r"\.svg|\.tif|\.pdf|\.gif|\.webm|\.ogv|\.ogg)", re.I)

ALLOWED = re.compile(r"(CC BY|CC0|Public domain|PD)", re.I)
# "CC BY-NC-ND" contains "CC BY", so permissive matching alone is not enough.
# NonCommercial and NoDerivatives both rule an image out: the puzzles get
# cropped and resized (a derivative), and the project may be commercial later.
DENIED = re.compile(r"(NC\b|NoDeriv|ND\b|non-?commercial|fair use|GFDL only)", re.I)


def license_ok(text):
    text = text or ""
    return bool(ALLOWED.search(text)) and not DENIED.search(text)


def api(params, retries=3):
    params = dict(params, format="json")
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt == retries - 1:
                raise
            time.sleep(1.5 * (attempt + 1))
    return {}


def search_titles(phrase, limit=SEARCH_DEPTH):
    d = api({"action": "query", "list": "search", "srsearch": phrase,
             "srnamespace": 6, "srlimit": limit})
    return [h["title"] for h in d.get("query", {}).get("search", [])]


def category_titles(cat, limit=SEARCH_DEPTH):
    d = api({"action": "query", "list": "categorymembers", "cmtitle": cat,
             "cmtype": "file", "cmlimit": limit})
    return [m["title"] for m in d.get("query", {}).get("categorymembers", [])]


def strip_html(v):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", v or "")).strip()


def file_info(title):
    d = api({"action": "query", "titles": title, "prop": "imageinfo",
             "iiprop": "url|extmetadata|size|mime", "iiurlwidth": THUMB_WIDTH})
    for page in d.get("query", {}).get("pages", {}).values():
        info = (page.get("imageinfo") or [None])[0]
        if not info:
            continue
        if "image" not in (info.get("mime") or ""):
            return None
        meta = info.get("extmetadata", {})
        return {
            "title": title,
            "url": info.get("thumburl") or info.get("url"),
            "page": info.get("descriptionurl", ""),
            "license": strip_html(meta.get("LicenseShortName", {}).get("value")),
            "artist": strip_html(meta.get("Artist", {}).get("value"))
                      or "Wikimedia Commons contributor",
            "descr": strip_html(meta.get("ImageDescription", {}).get("value"))[:280],
        }
    return None


def download(url, path):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=90) as r, open(path, "wb") as f:
        f.write(r.read())


def run(name, phrases, categories, manifest):
    print(f"\n=== {name} ===")
    titles, seen = [], set()
    try:
        for p in phrases:
            for t in search_titles(p):
                if t not in seen:
                    seen.add(t); titles.append(t)
        for c in categories:
            for t in category_titles(c):
                if t not in seen:
                    seen.add(t); titles.append(t)
    except Exception as e:
        print(f"  ! lookup failed: {e}")
        return

    folder = os.path.join(OUT, name)
    os.makedirs(folder, exist_ok=True)
    kept = 0

    for title in titles:
        if kept >= PER_CONDITION:
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
        if not license_ok(info["license"]):
            print(f"  - skip ({info['license'] or 'unknown licence'})")
            continue

        kept += 1
        fname = f"{kept:02d}.jpg"
        path = os.path.join(folder, fname)
        try:
            download(info["url"], path)
        except Exception as e:
            print(f"  ! download failed {title}: {e}")
            kept -= 1
            continue

        print(f"  + {fname}  {info['license']:<18} {title[5:60]}")
        manifest.append(
            f"{name}/{fname}\n"
            f"    commons: {info['title']}\n"
            f"    license: {info['license']}\n"
            f"    author:  {info['artist']}\n"
            f"    source:  {info['page']}\n"
            f"    descr:   {info['descr']}\n")

    if kept == 0:
        print("  (nothing usable found — will need a manual look)")


def main():
    wanted = sys.argv[1:] or list(CONDITIONS)
    unknown = [w for w in wanted if w not in CONDITIONS]
    if unknown:
        print("Unknown:", ", ".join(unknown))
        print("Available:", ", ".join(CONDITIONS))
        sys.exit(1)

    os.makedirs(OUT, exist_ok=True)
    manifest = []
    for name in wanted:
        phrases, categories = CONDITIONS[name]
        run(name, phrases, categories, manifest)

    with open(os.path.join(OUT, "MANIFEST.txt"), "w") as f:
        f.write("\n".join(manifest))

    print(f"\n{'-' * 50}")
    print(f"{len(manifest)} candidates saved in ./{OUT}/")
    print("Look through them:  open candidates")


if __name__ == "__main__":
    main()
