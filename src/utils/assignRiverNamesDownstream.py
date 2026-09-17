import geopandas as gpd
import pandas as pd


# ============================================================
# FILE PATHS
# ============================================================

GDB_PATH = "/Users/bethlarsen/Downloads/Hydro Lab/geoglows-v2-map-optimized.gdb"
GDB_LAYER = "geoglowsv2"

NAMES_FILE = '/Users/bethlarsen/Downloads/Watershed & Subbasin Names.xlsx'

OUTPUT_CSV = "/Users/bethlarsen/Downloads/Hydro Lab/rivers_downstream.csv"



# ============================================================
# 1. LOAD GEOGLOWS NETWORK
# ============================================================

print("Loading GEOGLOWSv2 network...")

rivers = gpd.read_file(
    GDB_PATH,
    layer=GDB_LAYER,
    ignore_geometry=True
)

print(f"Loaded {len(rivers):,} river reaches")


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


# ============================================================
# 2. BUILD DOWNSTREAM LOOKUP
# ============================================================

# LINKNO → DSLINKNO
#
# Example:
#
# 102 → 101
# 101 → 200
# 200 → 300

downstream = {}

for _, row in rivers.iterrows():

    linkno = int(row["LINKNO"])
    dslinkno = row["DSLINKNO"]

    if pd.notna(dslinkno):
        downstream[linkno] = int(dslinkno)


print(f"Downstream relationships: {len(downstream):,}")


# ============================================================
# 3. LOAD NAMED RIVER FILE
# ============================================================

print("\nLoading named river file...")

names = pd.read_excel(NAMES_FILE)

print(f"Named records: {len(names)}")
print(f"Columns: {names.columns.tolist()}")


# Keep only records with a name and Outlet ID
names = names.dropna(
    subset=["River Name", "Outlet ID"]
).copy()


# Clean names
names["River Name"] = (
    names["River Name"]
    .astype(str)
    .str.strip()
)


# Clean Outlet IDs
names["Outlet ID"] = pd.to_numeric(
    names["Outlet ID"],
    errors="coerce"
)

names = names.dropna(
    subset=["Outlet ID"]
)

names["Outlet ID"] = names["Outlet ID"].astype("int64")


# ============================================================
# 4. CREATE NAMED OUTLET LOOKUP
# ============================================================

# Outlet LINKNO → River Name
named_outlets = dict(
    zip(
        names["Outlet ID"],
        names["River Name"]
    )
)


print(f"Named outlets: {len(named_outlets):,}")


# Check how many actually exist in the network
network_ids = set(rivers["LINKNO"])

found_outlets = {
    linkno: name
    for linkno, name in named_outlets.items()
    if linkno in network_ids
}

missing_outlets = {
    linkno: name
    for linkno, name in named_outlets.items()
    if linkno not in network_ids
}


print("\nNamed outlet matching:")
print(f"  Found:   {len(found_outlets):,}")
print(f"  Missing: {len(missing_outlets):,}")


if missing_outlets:

    print("\nMissing named outlets:")

    for linkno, name in missing_outlets.items():
        print(f"  {name}: {linkno}")


# ============================================================
# 5. FOLLOW EACH REACH DOWNSTREAM
# ============================================================

print("\nTracing downstream paths...")


# Cache results so that once we've figured out the name
# for a downstream reach, upstream reaches can reuse it.
#
# Example:
#
# 102 → 101 → 200
#
# Once 101 knows it leads to Negro, 102 can immediately
# inherit that result.


result_cache = {}


def find_nearest_named_outlet(start_linkno):

    """
    Follow the downstream network from start_linkno.

    Return:
        (river_name, named_outlet)

    if a named outlet is encountered.

    Return:
        (None, None)

    if no named outlet is encountered.
    """

    path = []
    visited = set()

    current = start_linkno

    while True:

        # ----------------------------------------------------
        # We found a named outlet
        # ----------------------------------------------------

        if current in found_outlets:

            river_name = found_outlets[current]

            result = (
                river_name,
                current
            )

            # Cache every reach we traversed
            for linkno in path:
                result_cache[linkno] = result

            return result


        # ----------------------------------------------------
        # We already solved this downstream path
        # ----------------------------------------------------

        if current in result_cache:

            result = result_cache[current]

            for linkno in path:
                result_cache[linkno] = result

            return result


        # ----------------------------------------------------
        # Detect loops
        # ----------------------------------------------------

        if current in visited:

            print(
                f"WARNING: Network loop detected "
                f"starting at {start_linkno}"
            )

            result = (None, None)

            for linkno in path:
                result_cache[linkno] = result

            return result


        visited.add(current)
        path.append(current)


        # ----------------------------------------------------
        # Find downstream reach
        # ----------------------------------------------------

        if current not in downstream:

            result = (None, None)

            for linkno in path:
                result_cache[linkno] = result

            return result


        next_link = downstream[current]


        # ----------------------------------------------------
        # Missing downstream link
        # ----------------------------------------------------

        if next_link not in network_ids:

            result = (None, None)

            for linkno in path:
                result_cache[linkno] = result

            return result


        current = next_link



# ============================================================
# 6. RUN FOR EVERY REACH
# ============================================================

assignments = []

total = len(network_ids)

for i, linkno in enumerate(network_ids):

    river_name, named_outlet = (
        find_nearest_named_outlet(linkno)
    )

    assignments.append({
        "LINKNO": linkno,
        "River Name": river_name,
        "Named Outlet": named_outlet
    })

    # Progress every 500,000 reaches
    if (i + 1) % 500_000 == 0:

        print(
            f"Processed "
            f"{i + 1:,} / {total:,}"
        )


assignments = pd.DataFrame(assignments)


# ============================================================
# 7. DIAGNOSTICS
# ============================================================

named_count = assignments["River Name"].notna().sum()

unnamed_count = assignments["River Name"].isna().sum()


print("\n========================================")
print("RESULTS")
print("========================================")

print(
    f"Total LINKNOs:              "
    f"{len(assignments):,}"
)

print(
    f"Assigned to named river:    "
    f"{named_count:,}"
)

print(
    f"No named outlet downstream: "
    f"{unnamed_count:,}"
)


# How many reaches each river name receives?
river_counts = (
    assignments
    .dropna(subset=["River Name"])
    .groupby("River Name")
    .size()
    .sort_values(ascending=False)
)

print("\nAll named rivers and assigned reaches:")

print(
    river_counts.to_string()
)

print("\nLargest named river networks:")

print(
    river_counts.head(20).to_string()
)


# ============================================================
# 8. SAVE RESULTS
# ============================================================

assignments.to_csv(
    OUTPUT_CSV,
    index=False
)


print("\nSaved:")
print(OUTPUT_CSV)

