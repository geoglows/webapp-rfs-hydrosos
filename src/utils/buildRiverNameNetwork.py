import geopandas as gpd
import pandas as pd
from collections import defaultdict, deque


# ============================================================
# FILE PATHS
# ============================================================

GDB_PATH = "/Users/bethlarsen/Downloads/Hydro Lab/geoglows-v2-map-optimized.gdb"
GDB_LAYER = "geoglowsv2"

NAMES_CSV = '/Users/bethlarsen/Downloads/Watershed & Subbasin Names.xlsx'

OUTPUT_CSV = "/Users/bethlarsen/Downloads/Hydro Lab/rivers_named.csv"


# ============================================================
# 1. LOAD THE GEOGLOWS NETWORK
# ============================================================

print("Loading GEOGLOWSv2 network...")

rivers = gpd.read_file(
    GDB_PATH,
    layer=GDB_LAYER,
    ignore_geometry=True
)

print(f"Loaded {len(rivers):,} river reaches")
print(f"Columns: {rivers.columns.tolist()}")


# Make sure IDs are numeric
rivers["LINKNO"] = pd.to_numeric(
    rivers["LINKNO"],
    errors="coerce"
)

rivers["DSLINKNO"] = pd.to_numeric(
    rivers["DSLINKNO"],
    errors="coerce"
)

rivers = rivers.dropna(subset=["LINKNO"])

rivers["LINKNO"] = rivers["LINKNO"].astype("int64")

print(f"Usable LINKNOs: {len(rivers):,}")


# ============================================================
# 2. BUILD THE NETWORK
# ============================================================

# LINKNO -> downstream LINKNO
downstream = dict(
    zip(
        rivers["LINKNO"],
        rivers["DSLINKNO"]
    )
)

# We also need the reverse relationship:
#
# downstream LINKNO -> all upstream LINKNOs
#
# Example:
#
# 200
# ├── 101
# └── 102

upstream = defaultdict(list)

for linkno, dslinkno in downstream.items():

    if pd.notna(dslinkno):
        upstream[int(dslinkno)].append(linkno)

print(f"Network nodes: {len(downstream):,}")
print(f"Upstream relationships: {sum(len(v) for v in upstream.values()):,}")


# ============================================================
# 3. LOAD THE NAMED RIVER CSV
# ============================================================

print("\nLoading named river CSV...")


names = pd.read_excel(NAMES_CSV)

print(f"CSV records: {len(names)}")
print(f"Columns: {names.columns.tolist()}")


# Keep only rows with both a name and Outlet ID
names = names.dropna(
    subset=["River Name", "Outlet ID"]
).copy()


# Clean up whitespace
names["River Name"] = (
    names["River Name"]
    .astype(str)
    .str.strip()
)


# Convert Outlet ID to integer
names["Outlet ID"] = pd.to_numeric(
    names["Outlet ID"],
    errors="coerce"
)

names = names.dropna(subset=["Outlet ID"])

names["Outlet ID"] = names["Outlet ID"].astype("int64")

print(f"Named outlets with valid IDs: {len(names)}")


# ============================================================
# 4. CHECK WHICH NAMED OUTLETS EXIST IN THE NETWORK
# ============================================================

network_ids = set(rivers["LINKNO"])

names["FoundInNetwork"] = (
    names["Outlet ID"].isin(network_ids)
)

found = names["FoundInNetwork"].sum()
missing = (~names["FoundInNetwork"]).sum()

print("\nNamed outlet matching:")
print(f"  Found:   {found}")
print(f"  Missing: {missing}")

if missing:
    print("\nMissing Outlet IDs:")

    print(
        names.loc[
            ~names["FoundInNetwork"],
            ["River Name", "Outlet ID"]
        ].to_string(index=False)
    )


# ============================================================
# 5. TRACE UPSTREAM REACHES
# ============================================================

print("\nTracing upstream networks...")


def get_upstream_reaches(outlet_id):
    """
    Return every LINKNO upstream of and including outlet_id.
    """

    visited = set()
    queue = deque([outlet_id])

    while queue:

        current = queue.popleft()

        if current in visited:
            continue

        visited.add(current)

        for upstream_id in upstream.get(current, []):
            if upstream_id not in visited:
                queue.append(upstream_id)

    return visited


# ============================================================
# 6. BUILD RAW NAME ASSIGNMENTS
# ============================================================

assignments = []

for _, row in names[names["FoundInNetwork"]].iterrows():

    river_name = row["River Name"]
    outlet_id = row["Outlet ID"]

    reaches = get_upstream_reaches(outlet_id)

    print(
        f"{river_name:30s} "
        f"{outlet_id} → "
        f"{len(reaches):,} upstream reaches"
    )

    for linkno in reaches:

        assignments.append({
            "LINKNO": linkno,
            "River Name": river_name,
            "Named Outlet": outlet_id
        })


assignments = pd.DataFrame(assignments)


# ============================================================
# 7. FIND REACHES WITH MULTIPLE POSSIBLE NAMES
# ============================================================

name_counts = (
    assignments
    .groupby("LINKNO")["River Name"]
    .nunique()
    .reset_index(name="NameCount")
)

assignments = assignments.merge(
    name_counts,
    on="LINKNO",
    how="left"
)


# ============================================================
# 8. SAVE THE DIAGNOSTIC DATASET
# ============================================================

assignments.to_csv(
    OUTPUT_CSV,
    index=False
)

print("\n========================================")
print("DONE")
print("========================================")

print(f"Assignments: {len(assignments):,}")
print(f"Unique LINKNOs: {assignments['LINKNO'].nunique():,}")

multiple_names = (
    assignments.loc[
        assignments["NameCount"] > 1,
        "LINKNO"
    ]
    .nunique()
)

print(
    f"LINKNOs with multiple possible names: "
    f"{multiple_names:,}"
)

print(f"\nSaved to:")
print(OUTPUT_CSV)