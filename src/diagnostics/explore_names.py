import json
import pandas as pd


# ============================================================
# 1. Load basin-name spreadsheet
# ============================================================

basins = pd.read_excel(
    "/Users/bethlarsen/Downloads/Watershed & Subbasin Names.xlsx"
)

basins["Outlet ID"] = pd.to_numeric(
    basins["Outlet ID"],
    errors="coerce"
)


# ============================================================
# 2. Load outlet lookup JSON
# ============================================================

with open(
    "/Users/bethlarsen/Downloads/Hydro Lab/rfs-v2-hydrosos/public/outlet_lookup.json",
    "r"
) as f:
    outlet_lookup = json.load(f)


# ============================================================
# 3. Extract river IDs
# ============================================================

lookup_river_ids = {
    int(data["riverID"])
    for data in outlet_lookup.values()
    if "riverID" in data
}


# ============================================================
# 4. Get named outlet IDs
# ============================================================

spreadsheet_ids = set(
    basins["Outlet ID"]
    .dropna()
    .astype(int)
)


# ============================================================
# 5. Test different matching tolerances
# ============================================================

tolerances = [0, 1, 2, 5, 25]

print("\n========================================")
print("OUTLET ID MATCHING")
print("========================================")

print(
    f"Named outlet IDs: {len(spreadsheet_ids):,}"
)

print(
    f"Outlet lookup riverIDs: {len(lookup_river_ids):,}"
)

print("\nTolerance results:")
print("----------------------------------------")

for tolerance in tolerances:

    matched = set()

    for outlet_id in spreadsheet_ids:

        for river_id in lookup_river_ids:

            if abs(outlet_id - river_id) <= tolerance:
                matched.add(outlet_id)
                break

    percent = (
        len(matched) /
        len(spreadsheet_ids) *
        100
    )

    print(
        f"±{tolerance:>2}: "
        f"{len(matched):>4} matches "
        f"({percent:>5.1f}%)"
    )

print("========================================")

# ============================================================
# 7. Show matching rivers
# ============================================================

# matches = basins[
#     basins["Outlet ID"].isin(matching_ids)
# ].copy()


# print("\nMATCHING RIVERS:")
# print(
#     matches[
#         ["River Name", "Outlet ID", "Country", "Notes"]
#     ].to_string(index=False)
# )


# ============================================================
# 8. Show rivers with no match
# ============================================================

# no_matches = basins[
#     ~basins["Outlet ID"].isin(matching_ids)
#     & basins["Outlet ID"].notna()
# ].copy()


# print("\nNO MATCH:")
# print(
#     no_matches[
#         ["River Name", "Outlet ID", "Country", "Notes"]
#     ].to_string(index=False)
# )