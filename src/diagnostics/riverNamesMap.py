import geopandas as gpd
import pandas as pd
import json
import matplotlib.pyplot as plt
import geodatasets


# ============================================================
# FILE PATHS
# ============================================================

HYDROBASINS = (
    "/Users/bethlarsen/Downloads/Hydro Lab/"
    "simple_hydrobasins.geojson"
)

OUTLET_NAMES = (
    '/Users/bethlarsen/Downloads/Hydro Lab/rfs-v2-hydrosos/public/outlet_names.json'
)

OUTPUT_PNG = (
    "/Users/bethlarsen/Downloads/Hydro Lab/"
    "named_hydrobasins.png"
)

world = gpd.read_file(
    geodatasets.get_path("naturalearth.land")
)



# ============================================================
# 1. LOAD HYDROBASINS
# ============================================================

print("=" * 60)
print("1. LOADING HYDROBASINS")
print("=" * 60)

basins = gpd.read_file(HYDROBASINS)

print(f"Loaded {len(basins):,} basins")
print(f"CRS: {basins.crs}")
print(f"Columns: {basins.columns.tolist()}")


# Make HYBAS_ID strings so they match the JSON keys
basins["HYBAS_ID"] = basins["HYBAS_ID"].astype(str)


# ============================================================
# 2. LOAD OUTLET NAMES
# ============================================================

print("\n" + "=" * 60)
print("2. LOADING OUTLET NAMES")
print("=" * 60)

with open(OUTLET_NAMES, "r") as f:
    outlet_names = json.load(f)

print(f"Loaded {len(outlet_names):,} outlet records")


# ============================================================
# 3. BUILD NAME TABLE
# ============================================================

name_records = []

for hybas_id, info in outlet_names.items():

    river_name = info.get("riverName")

    if river_name:

        name_records.append({
            "HYBAS_ID": str(hybas_id),
            "riverName": river_name,
            "riverID": info.get("riverID"),
            "nameLinkno": info.get("nameLinkno"),
            "nameSteps": info.get("nameSteps"),
        })


names = pd.DataFrame(name_records)

print(f"Named outlet records: {len(names):,}")
print(f"Unique river names: {names['riverName'].nunique():,}")


# ============================================================
# 4. JOIN NAMES TO HYDROBASINS
# ============================================================

print("\n" + "=" * 60)
print("3. MATCHING NAMED BASINS")
print("=" * 60)

named_basins = basins.merge(
    names,
    on="HYBAS_ID",
    how="inner"
)

print(f"Matched named basins: {len(named_basins):,}")


# ============================================================
# 5. CHECK THE MATCH
# ============================================================

print("\nExample matches:")

print(
    named_basins[
        ["HYBAS_ID", "riverName", "riverID", "nameSteps"]
    ]
    .head(20)
    .to_string(index=False)
)


# ============================================================
# 6. LOAD WORLD BASEMAP
# ============================================================

import geodatasets

world = gpd.read_file(
    geodatasets.get_path("naturalearth.land")
)

# Keep everything in geographic coordinates.
# This avoids the projection issue we saw with Web Mercator.


# ============================================================
# 7. CREATE MAP
# ============================================================

fig, ax = plt.subplots(
    figsize=(16, 9)
)


# ============================================================
# 8. WORLD BASEMAP
# ============================================================

world.plot(
    ax=ax,
    facecolor="lightgray",
    edgecolor="gray",
    linewidth=0.4
)


# ============================================================
# 9. NAMED HYDROBASINS
# ============================================================

named_basins.plot(
    ax=ax,
    alpha=0.60,
    edgecolor="black",
    linewidth=0.25
)


# ============================================================
# 10. SELECT RIVER LABELS
# ============================================================

# We do NOT want to label all 414 rivers.
#
# Instead, use the largest basin associated with each river
# and label the largest 40 rivers by drainage area.

label_candidates = (
    named_basins
    .sort_values("UP_AREA", ascending=False)
    .drop_duplicates("riverName")
)

# Number of river names to display
MAX_LABELS = 40

labels = label_candidates.head(MAX_LABELS).copy()


# ============================================================
# 11. ADD RIVER LABELS
# ============================================================

for _, row in labels.iterrows():

    point = row.geometry.representative_point()

    ax.text(
        point.x,
        point.y,
        row["riverName"],
        fontsize=7,
        fontweight="bold",
        ha="center",
        va="center",
        bbox=dict(
            facecolor="white",
            edgecolor="none",
            alpha=0.65,
            pad=1.5
        )
    )


# ============================================================
# 12. MAP EXTENT
# ============================================================

ax.set_xlim(-180, 180)
ax.set_ylim(-60, 85)


# ============================================================
# 13. TITLE
# ============================================================

ax.set_title(
    "HydroBASINS with Assigned River Names",
    fontsize=20,
    pad=18
)

ax.text(
    0.5,
    1.01,
    (
        f"{len(named_basins):,} basins assigned using "
        "GEOGloWS river-network tracing"
    ),
    transform=ax.transAxes,
    ha="center",
    fontsize=11
)


# ============================================================
# 14. CLEAN UP
# ============================================================

ax.set_axis_off()

plt.tight_layout()


# ============================================================
# 15. SAVE
# ============================================================

plt.savefig(
    OUTPUT_PNG,
    dpi=300,
    bbox_inches="tight"
)

print(f"\nSaved map:")
print(OUTPUT_PNG)

plt.show()