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
    "river_name_tracing_distance.png"
)


# ============================================================
# 1. LOAD HYDROBASINS
# ============================================================

print("=" * 60)
print("1. LOADING HYDROBASINS")
print("=" * 60)

basins = gpd.read_file(HYDROBASINS)

basins["HYBAS_ID"] = (
    basins["HYBAS_ID"]
    .astype(str)
)

print(f"Loaded {len(basins):,} basins")


# ============================================================
# 2. LOAD OUTLET NAME RESULTS
# ============================================================

print("\n" + "=" * 60)
print("2. LOADING OUTLET NAME RESULTS")
print("=" * 60)

with open(OUTLET_NAMES, "r") as f:
    outlet_names = json.load(f)

print(f"Loaded {len(outlet_names):,} outlet records")


# ============================================================
# 3. BUILD NAME TABLE
# ============================================================

records = []

for hybas_id, info in outlet_names.items():

    if info.get("riverName"):

        records.append({
            "HYBAS_ID": str(hybas_id),
            "riverName": info["riverName"],
            "nameSteps": info.get("nameSteps"),
        })


names = pd.DataFrame(records)

print(f"Named basins: {len(names):,}")


# ============================================================
# 4. JOIN TO HYDROBASINS
# ============================================================

named_basins = basins.merge(
    names,
    on="HYBAS_ID",
    how="inner"
)

print(
    f"Matched named basins: "
    f"{len(named_basins):,}"
)


# ============================================================
# 5. CLEAN AND CLASSIFY TRACING DISTANCE
# ============================================================

print("\n" + "=" * 60)
print("3. ANALYZING NETWORK TRACING DISTANCE")
print("=" * 60)

# Make absolutely sure nameSteps is numeric
named_basins["nameSteps"] = pd.to_numeric(
    named_basins["nameSteps"],
    errors="coerce"
)

print("\nnameSteps data type:")
print(named_basins["nameSteps"].dtype)

print("\nnameSteps statistics:")
print(named_basins["nameSteps"].describe())


# ------------------------------------------------------------
# Classification function
# ------------------------------------------------------------

def classify_steps(steps):

    if pd.isna(steps):
        return "Unknown"

    if steps == 0:
        return "0 — Direct match"

    if steps <= 10:
        return "1–10 — Very close"

    if steps <= 100:
        return "11–100 — Short trace"

    if steps <= 300:
        return "101–300 — Moderate trace"

    if steps <= 500:
        return "301–500 — Long trace"

    return "500+ — Very long trace"


named_basins["trace_class"] = (
    named_basins["nameSteps"]
    .apply(classify_steps)
)


# ============================================================
# 6. PRINT TRACING SUMMARY
# ============================================================

print("\n" + "=" * 60)
print("TRACING DISTANCE SUMMARY")
print("=" * 60)

summary = (
    named_basins["trace_class"]
    .value_counts()
    .reindex([
        "0 — Direct match",
        "1–10 — Very close",
        "11–100 — Short trace",
        "101–300 — Moderate trace",
        "301–500 — Long trace",
        "500+ — Very long trace",
        "Unknown"
    ])
    .fillna(0)
    .astype(int)
)

print()

for category, count in summary.items():

    if count > 0:

        percent = (
            count /
            len(named_basins)
            * 100
        )

        print(
            f"{category:<30} "
            f"{count:>4} basins "
            f"({percent:5.1f}%)"
        )


print("\nTotal named basins:", len(named_basins))


# ============================================================
# 7. LOAD WORLD BASEMAP
# ============================================================

world = gpd.read_file(
    geodatasets.get_path("naturalearth.land")
)


# ============================================================
# 8. CREATE MAP
# ============================================================

fig, ax = plt.subplots(
    figsize=(16, 9)
)


# ============================================================
# 9. WORLD BASEMAP
# ============================================================

world.plot(
    ax=ax,
    facecolor="lightgray",
    edgecolor="gray",
    linewidth=0.4
)


# ============================================================
# 10. COLORS
# ============================================================

colors = {

    "0 — Direct match":
        "#2166AC",

    "1–10 — Very close":
        "#67A9CF",

    "11–100 — Short trace":
        "#D1E5F0",

    "101–300 — Moderate trace":
        "#FDDBC7",

    "301–500 — Long trace":
        "#EF8A62",

    "500+ — Very long trace":
        "#B2182B",

    "Unknown":
        "#999999"
}


# ============================================================
# 11. PLOT EACH TRACING CATEGORY
# ============================================================

plot_order = [

    "0 — Direct match",

    "1–10 — Very close",

    "11–100 — Short trace",

    "101–300 — Moderate trace",

    "301–500 — Long trace",

    "500+ — Very long trace",

    "Unknown"
]


for trace_class in plot_order:

    subset = named_basins[
        named_basins["trace_class"] == trace_class
    ]

    print(
        f"Plotting {trace_class}: "
        f"{len(subset)} basins"
    )

    if subset.empty:
        continue

    subset.plot(
        ax=ax,

        color=colors[trace_class],

        alpha=0.75,

        edgecolor="black",

        linewidth=0.25,

        label=trace_class
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
    "Distance Traveled to Assign River Names",
    fontsize=20,
    pad=18
)

ax.text(
    0.5,
    1.01,
    (
        "Number of GEOGloWS river reaches traced downstream "
        "before encountering a named river"
    ),
    transform=ax.transAxes,
    ha="center",
    fontsize=11
)


# ============================================================
# 14. LEGEND
# ============================================================

from matplotlib.patches import Patch

legend_handles = []

for category in plot_order:

    count = summary.get(category, 0)

    if count == 0:
        continue

    legend_handles.append(
        Patch(
            facecolor=colors[category],
            edgecolor="black",
            label=f"{category}  ({count})"
        )
    )


# ============================================================
# 15. ADD LEGEND TO FIGURE
# ============================================================

fig.legend(
    handles=legend_handles,
    title="Network tracing distance",
    loc="lower left",
    bbox_to_anchor=(0.08, 0.08),
    fontsize=9,
    title_fontsize=10,
    frameon=True
)


# ============================================================
# 16. ADD SUMMARY TO FIGURE
# ============================================================

summary_lines = [
    "Naming network summary",
    "",
    f"Named basins: {len(named_basins):,}",
]

for category in plot_order:

    count = summary.get(category, 0)

    if count == 0:
        continue

    percent = (
        count / len(named_basins) * 100
    )

    # Remove the descriptive text after the dash
    short_name = category.split("—")[1].strip()

    summary_lines.append(
        f"{short_name}: {count:,} ({percent:.1f}%)"
    )


fig.text(
    0.88,
    0.05,
    "\n".join(summary_lines),
    ha="right",
    va="bottom",
    fontsize=9,
    bbox=dict(
        boxstyle="round,pad=0.6",
        facecolor="white",
        edgecolor="gray",
        alpha=0.9
    )
)


# ============================================================
# 17. CLEAN UP
# ============================================================

ax.set_axis_off()


# ============================================================
# 18. SAVE
# ============================================================

plt.tight_layout()

plt.savefig(
    OUTPUT_PNG,
    dpi=300,
    bbox_inches="tight"
)

print("\n" + "=" * 60)
print("MAP SAVED")
print("=" * 60)

print(OUTPUT_PNG)

plt.show()