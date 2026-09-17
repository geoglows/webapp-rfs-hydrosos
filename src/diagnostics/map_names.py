import json
import pandas as pd
import geopandas as gpd
import matplotlib.pyplot as plt


# ============================================================
# 1. Load named basin spreadsheet
# ============================================================

basins = pd.read_excel(
    "/Users/bethlarsen/Downloads/Watershed & Subbasin Names.xlsx"
)

basins["Outlet ID"] = pd.to_numeric(
    basins["Outlet ID"],
    errors="coerce"
)

# Keep only rows with a named outlet
basins = basins[
    basins["Outlet ID"].notna()
].copy()

basins["Outlet ID"] = basins["Outlet ID"].astype(int)


# ============================================================
# 2. Load outlet lookup
# ============================================================

with open(
    "/Users/bethlarsen/Downloads/Hydro Lab/rfs-v2-hydrosos/public/outlet_lookup.json",
    "r"
) as f:
    outlet_lookup = json.load(f)


# ============================================================
# 3. Create riverID → HydroBASIN ID lookup
# ============================================================

river_to_basin = {}

for hydrobasin_id, data in outlet_lookup.items():

    if "riverID" in data:

        river_id = int(data["riverID"])

        river_to_basin[river_id] = int(hydrobasin_id)


# ============================================================
# 4. Match named rivers to HydroBASINS
# ============================================================

basins["HYBAS_ID"] = basins["Outlet ID"].map(
    river_to_basin
)

matched = basins[
    basins["HYBAS_ID"].notna()
].copy()

matched["HYBAS_ID"] = matched["HYBAS_ID"].astype(int)


print("\n========================================")
print("MATCHED BASINS")
print("========================================")

print(f"Named outlets: {len(basins):,}")
print(f"Matched outlets: {len(matched):,}")

print("\nMatched rivers:")
print(
    matched[
        ["River Name", "Outlet ID", "HYBAS_ID"]
    ].to_string(index=False)
)


# ============================================================
# 5. Load HydroBASINS geometry
# ============================================================

hydrobasins = gpd.read_file(
    "/Users/bethlarsen/Downloads/Hydro Lab/HydroSOSapp/hydrobasins/hydrobasins_level4_global.gpkg"
)


# ============================================================
# 6. Make sure the HydroBASINS ID is numeric
# ============================================================

hydrobasins["HYBAS_ID"] = pd.to_numeric(
    hydrobasins["HYBAS_ID"],
    errors="coerce"
)


# ============================================================
# 7. Join river names onto HydroBASINS
# ============================================================

matched_basins = hydrobasins.merge(
    matched[
        ["HYBAS_ID", "River Name", "Outlet ID"]
    ],
    on="HYBAS_ID",
    how="inner"
)


# ============================================================
# 8. Plot
# ============================================================

fig, ax = plt.subplots(
    figsize=(16, 10)
)

# All HydroBASINS
hydrobasins.plot(
    ax=ax,
    facecolor="lightgray",
    edgecolor="white",
    linewidth=0.1
)

# Matched basins
matched_basins.plot(
    ax=ax,
    facecolor="red",
    edgecolor="black",
    linewidth=0.5
)

ax.set_title(
    f"HydroBASINS with Named River Matches\n"
    f"{len(matched_basins)} matched basins",
    fontsize=16
)

ax.set_axis_off()

plt.tight_layout()

plt.show()