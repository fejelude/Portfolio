#!/usr/bin/env python3
"""Import only individually approved gameplay screenshots; never fetch remote images."""
import argparse
import hashlib
import html
import json
from pathlib import Path
import tempfile
from urllib.parse import urlparse
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets" / "mario-odyssey-memories"
GALLERY = ROOT / "Gallery.html"
START = "        <!-- mario-odyssey:start -->"
END = "        <!-- mario-odyssey:end -->"

def esc(value):
    return html.escape(value, quote=True)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("images", type=Path)
    parser.add_argument("approvals", type=Path)
    args = parser.parse_args()
    entries = json.loads((ASSETS / "manifest.json").read_text())["entries"]
    approvals = json.loads(args.approvals.read_text())
    if set(approvals) != {e["id"] for e in entries}:
        raise ValueError("Exactly 21 matching approval records are required")
    original = GALLERY.read_text()
    if original.count(START) != 1 or original.count(END) != 1:
        raise ValueError("Missing or duplicate Mario section markers")
    prefix, rest = original.split(START, 1)
    block, suffix = rest.split(END, 1)
    header, _ = block.split('        <div id="mario-odyssey-grid"', 1)
    # The pending template is inert: do not expose empty cards to visitors.
    header = header.replace('        <template id="mario-pending-images">\n', '', 1)
    cards, credits, receipt, hashes = [], [], [], set()
    source_root = args.images.resolve()
    with tempfile.TemporaryDirectory(dir=ASSETS) as directory:
        staging = Path(directory)
        for entry in entries:
            row = approvals[entry["id"]]
            for field in ("input", "credit", "source", "permission", "description"):
                if not isinstance(row.get(field), str) or not row[field].strip():
                    raise ValueError(f"{entry['id']}: missing {field}")
            if urlparse(row["source"]).scheme != "https" or not urlparse(row["source"]).netloc:
                raise ValueError("A valid HTTPS provenance URL is required")
            if row["permission"].strip().lower() in {"unknown", "pending", "not verified", "none", "n/a"}:
                raise ValueError("Documented reuse permission is required")
            source = (source_root / row["input"]).resolve()
            if not source.is_relative_to(source_root) or not source.is_file():
                raise ValueError("Input file must exist inside the approved directory")
            with Image.open(source) as raw:
                if raw.format not in {"JPEG", "PNG", "WEBP"}:
                    raise ValueError("Only JPEG, PNG or WebP inputs are accepted")
                if getattr(raw, "n_frames", 1) != 1:
                    raise ValueError("Animated images are not accepted")
                im = ImageOps.exif_transpose(raw).convert("RGB")
                w, h = im.size
                if w < 1280 or h < 720 or abs(w / h - 16 / 9) > .035:
                    raise ValueError(f"{entry['id']}: expected at least 1280×720 and near-16:9")
                digest = hashlib.sha256(im.tobytes()).hexdigest()
                if digest in hashes:
                    raise ValueError("Duplicate screenshot")
                hashes.add(digest)
                im.thumbnail((1920, 1080), Image.Resampling.LANCZOS)
                w, h = im.size
                im.save(staging / entry["file"], "WEBP", quality=92, method=6)
            caption = esc(entry["caption"])
            alt = esc(entry["caption"] + " — " + row["description"])
            cards.append(f'''           <div class="gallery-item reveal" data-mario-memory="{entry['id']}">
             <img src="/assets/mario-odyssey-memories/{entry['file']}" alt="{alt}" class="gallery-img" loading="lazy" decoding="async" width="{w}" height="{h}" data-source="{esc(row['source'])}">
             <div class="gallery-caption">{caption}</div>
           </div>''')
            credits.append(f'            <li>{caption}: <a href="{esc(row["source"])}" target="_blank" rel="noopener noreferrer">{esc(row["credit"])}</a></li>')
            receipt.append(dict(id=entry["id"], file=entry["file"], credit=row["credit"], source=row["source"], permission=row["permission"], description=row["description"], width=w, height=h))
        replacement = (START + header + '        <div id="mario-odyssey-grid" class="gallery-grid" aria-labelledby="mario-odyssey">\n' + "\n".join(cards) + '\n        </div>\n        <details id="mario-image-credits" style="margin-top: 24px;">\n          <summary>Screenshot credits</summary>\n          <ul>\n' + "\n".join(credits) + '\n          </ul>\n        </details>\n' + END)
        for entry in entries:
            (staging / entry["file"]).replace(ASSETS / entry["file"])
        (ASSETS / "credits.json").write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n")
        GALLERY.write_text(prefix + replacement + suffix)
    print("Imported 21 approved images. Review actual browser renders before publishing.")

if __name__ == "__main__":
    main()
