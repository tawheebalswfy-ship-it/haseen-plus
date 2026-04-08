import os, re

report_py = os.path.join("scripts", "reporting", "generate_gp2_report.py")
asset_dir = os.path.join("artifacts", "report-assets")

with open(report_py, encoding="utf-8") as f:
    text = f.read()

refs = set(re.findall(r'(fig_[^"]+\.png)', text))
disk = set(os.listdir(asset_dir))

print("=== MISSING (referenced but not on disk) ===")
for x in sorted(refs - disk):
    print(f"  {x}")
if not (refs - disk):
    print("  (none)")

print("\n=== UNUSED (on disk but not referenced) ===")
for x in sorted(disk - refs):
    print(f"  {x}")
if not (disk - refs):
    print("  (none)")

print(f"\nReferenced: {len(refs)}, On disk: {len(disk)}")

# Also check iso-policy-project version
iso_py = os.path.join("iso-policy-project", "generate_gp2_report.py")
iso_dir = os.path.join("iso-policy-project", "report_assets")
with open(iso_py, encoding="utf-8") as f:
    text2 = f.read()
refs2 = set(re.findall(r'(fig_[^"]+\.png)', text2))
disk2 = set(os.listdir(iso_dir))

print("\n=== ISO-PROJECT: MISSING ===")
for x in sorted(refs2 - disk2):
    print(f"  {x}")
if not (refs2 - disk2):
    print("  (none)")

print("\n=== ISO-PROJECT: UNUSED ===")
for x in sorted(disk2 - refs2):
    print(f"  {x}")
if not (disk2 - refs2):
    print("  (none)")

print(f"\nISO Referenced: {len(refs2)}, ISO On disk: {len(disk2)}")

# Charts
chart_dir = os.path.join("artifacts", "report_charts")
chart_refs = set(re.findall(r'((?:confusion|dataset|domain|gap|per_gap|roc|training)[^"]*\.png)', text2))
chart_disk = set(os.listdir(chart_dir))
print(f"\n=== CHART REFS (iso report) ===")
for x in sorted(chart_refs): print(f"  {x}")
print(f"Charts on disk: {sorted(chart_disk)}")
