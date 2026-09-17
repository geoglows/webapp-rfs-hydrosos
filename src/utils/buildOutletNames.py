import json
import geopandas as gpd
import pandas as pd


# ============================================================
# FILE PATHS
# ============================================================

GDB_PATH = "/Users/bethlarsen/Downloads/Hydro Lab/geoglows-v2-map-optimized.gdb"
GDB_LAYER = "geoglowsv2"

OUTLET_LOOKUP = '/Users/bethlarsen/Downloads/Hydro Lab/rfs-v2-hydrosos/public/outlet_lookup.json'

NAMES_XLSX = "/Users/bethlarsen/Downloads/Watershed & Subbasin Names.xlsx"

OUTPUT_JSON = "/Users/bethlarsen/Downloads/Hydro Lab/outlet_names.json"


# ============================================================
# SETTINGS
# ============================================================

# Maximum number of downstream reaches we will follow
# for a single outlet.
MAX_STEPS = 10000


# ============================================================
# 1. LOAD THE GEOGLOWS NETWORK
# ============================================================

print()
print("=" * 60)
print("1. LOADING GEOGLOWS NETWORK")
print("=" * 60)

print("Loading river network...")

rivers = gpd.read_file(
    GDB_PATH,
    layer=GDB_LAYER,
    ignore_geometry=True
)

print(f"Loaded {len(rivers):,} river reaches")
print(f"Columns: {rivers.columns.tolist()}")


# Make IDs numeric
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
# 2. BUILD DOWNSTREAM NETWORK
# ============================================================

print()
print("=" * 60)
print("2. BUILDING DOWNSTREAM NETWORK")
print("=" * 60)


# LINKNO -> downstream LINKNO
#
# Example:
#
# 100 -> 200
# 200 -> 300
# 300 -> 400

downstream = dict(
    zip(
        rivers["LINKNO"],
        rivers["DSLINKNO"]
    )
)

print(f"Network nodes: {len(downstream):,}")


# ============================================================
# 3. LOAD RIVER NAMES
# ============================================================

print()
print("=" * 60)
print("3. LOADING RIVER NAMES")
print("=" * 60)

names = pd.read_excel(NAMES_XLSX)

print(f"Loaded {len(names):,} name records")
print(f"Columns: {names.columns.tolist()}")


# ------------------------------------------------------------
# IMPORTANT:
#
# CHANGE THESE TWO COLUMN NAMES IF NEEDED
# ------------------------------------------------------------

NAME_LINKNO_COLUMN = "Outlet ID"
NAME_COLUMN = "River Name"


# Make LINKNO numeric
names[NAME_LINKNO_COLUMN] = pd.to_numeric(
    names[NAME_LINKNO_COLUMN],
    errors="coerce"
)

names = names.dropna(subset=[NAME_LINKNO_COLUMN])

names[NAME_LINKNO_COLUMN] = names[
    NAME_LINKNO_COLUMN
].astype("int64")


# Remove blank names
names[NAME_COLUMN] = names[NAME_COLUMN].astype(str).str.strip()

names = names[
    names[NAME_COLUMN].notna()
    & (names[NAME_COLUMN] != "")
    & (names[NAME_COLUMN].str.lower() != "nan")
]


# ------------------------------------------------------------
# Build:
#
# LINKNO -> river name
# ------------------------------------------------------------

river_names = dict(
    zip(
        names[NAME_LINKNO_COLUMN],
        names[NAME_COLUMN]
    )
)

print(f"Named river reaches: {len(river_names):,}")


# ============================================================
# 4. LOAD OUTLET LOOKUP
# ============================================================

print()
print("=" * 60)
print("4. LOADING OUTLET LOOKUP")
print("=" * 60)

with open(OUTLET_LOOKUP, "r") as f:
    outlet_lookup = json.load(f)

print(f"Loaded {len(outlet_lookup):,} outlets")

# ============================================================
# DIAGNOSTIC: CHECK OUTLET RIVER IDs
# ============================================================

print()
print("=" * 60)
print("NETWORK COVERAGE DIAGNOSTIC")
print("=" * 60)

river_ids = [
    int(info["riverID"])
    for info in outlet_lookup.values()
    if info.get("riverID") is not None
]

found_river_ids = [
    rid for rid in river_ids
    if rid in downstream
]

missing_river_ids = [
    rid for rid in river_ids
    if rid not in downstream
]

print(f"Outlet riverIDs:            {len(river_ids):,}")
print(f"Found in river network:     {len(found_river_ids):,}")
print(f"NOT found in river network: {len(missing_river_ids):,}")

if river_ids:
    print(
        f"Network coverage:           "
        f"{len(found_river_ids) / len(river_ids) * 100:.2f}%"
    )

print()
print("First 20 missing riverIDs:")

for rid in missing_river_ids[:20]:
    print(rid)


# ============================================================
# 5. TRACE EACH OUTLET DOWNSTREAM
# ============================================================

print()
print("=" * 60)
print("5. TRACING OUTLETS DOWNSTREAM")
print("=" * 60)


def find_river_name(start_river_id):
    """
    Start at a GEOGLOWS river LINKNO and follow
    DSLINKNO downstream until a named river reach
    is encountered.
    """

    current = start_river_id
    visited = set()

    for step in range(MAX_STEPS):

        # ----------------------------------------------------
        # Have we reached a named river?
        # ----------------------------------------------------

        if current in river_names:

            return {
                "name": river_names[current],
                "name_linkno": current,
                "steps": step,
                "status": "named"
            }


        # ----------------------------------------------------
        # Detect loops
        # ----------------------------------------------------

        if current in visited:

            return {
                "name": None,
                "name_linkno": None,
                "steps": step,
                "status": "loop"
            }

        visited.add(current)


        # ----------------------------------------------------
        # Does this river exist in the network?
        # ----------------------------------------------------

        if current not in downstream:

            return {
                "name": None,
                "name_linkno": None,
                "steps": step,
                "status": "missing_network"
            }


        # ----------------------------------------------------
        # Move downstream
        # ----------------------------------------------------

        next_river = downstream[current]

        if pd.isna(next_river):

            return {
                "name": None,
                "name_linkno": None,
                "steps": step,
                "status": "network_end"
            }

        current = int(next_river)


    # --------------------------------------------------------
    # Too many steps
    # --------------------------------------------------------

    return {
        "name": None,
        "name_linkno": None,
        "steps": MAX_STEPS,
        "status": "max_steps"
    }


# ============================================================
# TRACE ALL OUTLETS
# ============================================================

results = {}

stats = {
    "named": 0,
    "already_named": 0,
    "missing_network": 0,
    "network_end": 0,
    "loop": 0,
    "max_steps": 0,
}


for i, (outlet_id, info) in enumerate(outlet_lookup.items(), start=1):

    river_id = info.get("riverID")

    if river_id is None:

        results[outlet_id] = {
            **info,
            "riverName": None,
            "nameLinkno": None,
            "nameSteps": None,
            "nameStatus": "missing_riverID"
        }

        continue


    river_id = int(river_id)


    # --------------------------------------------------------
    # Trace downstream
    # --------------------------------------------------------

    result = find_river_name(river_id)


    # --------------------------------------------------------
    # Save result
    # --------------------------------------------------------

    results[outlet_id] = {
        **info,
        "riverName": result["name"],
        "nameLinkno": result["name_linkno"],
        "nameSteps": result["steps"],
        "nameStatus": result["status"]
    }


    # --------------------------------------------------------
    # Statistics
    # --------------------------------------------------------

    stats[result["status"]] = (
        stats.get(result["status"], 0) + 1
    )


    # --------------------------------------------------------
    # Progress
    # --------------------------------------------------------

    if i % 100000 == 0:

        print(
            f"Processed {i:,} / "
            f"{len(outlet_lookup):,} outlets..."
        )


# ============================================================
# 6. SAVE RESULTS
# ============================================================

print()
print("=" * 60)
print("6. SAVING RESULTS")
print("=" * 60)

with open(OUTPUT_JSON, "w") as f:

    json.dump(
        results,
        f,
        indent=2
    )

print(f"Saved: {OUTPUT_JSON}")


# ============================================================
# 7. SUMMARY
# ============================================================

print()
print("=" * 60)
print("OUTLET NAME RESULTS")
print("=" * 60)

total = len(outlet_lookup)

print(f"Total outlets:             {total:,}")
print(
    f"Assigned named river:      "
    f"{stats.get('named', 0):,}"
)
print(
    f"Missing network:           "
    f"{stats.get('missing_network', 0):,}"
)
print(
    f"Network ended:             "
    f"{stats.get('network_end', 0):,}"
)
print(
    f"Network loops:             "
    f"{stats.get('loop', 0):,}"
)
print(
    f"Exceeded max steps:        "
    f"{stats.get('max_steps', 0):,}"
)

named = stats.get("named", 0)

if total > 0:

    print()
    print(
        f"Name assignment rate:      "
        f"{named / total * 100:.2f}%"
    )


# ============================================================
# 8. SHOW EXAMPLES
# ============================================================

print()
print("=" * 60)
print("EXAMPLE RESULTS")
print("=" * 60)

shown = 0

for outlet_id, result in results.items():

    if result["riverName"] is not None:

        print(
            f"{outlet_id}  "
            f"riverID={result['riverID']}  "
            f"→ {result['riverName']}  "
            f"(matched LINKNO={result['nameLinkno']}, "
            f"{result['nameSteps']} steps)"
        )

        shown += 1

        if shown >= 20:
            break

print()
print("Done!")