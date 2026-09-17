import geopandas as gpd
import pandas as pd
import json

from collections import defaultdict, deque


# ============================================================
# FILE PATHS
# ============================================================

GDB_PATH = (
    "/Users/bethlarsen/Downloads/Hydro Lab/"
    "geoglows-v2-map-optimized.gdb"
)

GDB_LAYER = "geoglowsv2"

NAMES_FILE = (
    "/Users/bethlarsen/Downloads/"
    "Watershed & Subbasin Names.xlsx"
)

OUTLET_LOOKUP_FILE = (
    "/Users/bethlarsen/Downloads/Hydro Lab/"
    "rfs-v2-hydrosos/public/outlet_lookup.json"
)

OUTLET_NAMES_FILE = (
    "/Users/bethlarsen/Downloads/Hydro Lab/"
    "rfs-v2-hydrosos/public/outlet_names.json"
)


# ============================================================
# 1. LOAD GEOGLOWS NETWORK
# ============================================================

print("=" * 60)
print("1. LOADING GEOGLOWS NETWORK")
print("=" * 60)

rivers = gpd.read_file(
    GDB_PATH,
    layer=GDB_LAYER,
    ignore_geometry=True
)

print(
    f"Loaded {len(rivers):,} river reaches"
)


# Clean IDs

rivers["LINKNO"] = pd.to_numeric(
    rivers["LINKNO"],
    errors="coerce"
)

rivers["DSLINKNO"] = pd.to_numeric(
    rivers["DSLINKNO"],
    errors="coerce"
)

rivers = rivers.dropna(
    subset=["LINKNO"]
).copy()

rivers["LINKNO"] = (
    rivers["LINKNO"]
    .astype("int64")
)


network_ids = set(
    rivers["LINKNO"]
)


print(
    f"Network LINKNOs: "
    f"{len(network_ids):,}"
)


# ============================================================
# 2. BUILD UPSTREAM NETWORK
# ============================================================

print("\n" + "=" * 60)
print("2. BUILDING UPSTREAM NETWORK")
print("=" * 60)


# downstream:
#
#     LINKNO → DSLINKNO

downstream = dict(
    zip(
        rivers["LINKNO"],
        rivers["DSLINKNO"]
    )
)


# upstream:
#
#     DSLINKNO → [LINKNO, LINKNO, ...]

upstream = defaultdict(list)


for linkno, dslinkno in downstream.items():

    if pd.notna(dslinkno):

        dslinkno = int(dslinkno)

        upstream[dslinkno].append(
            int(linkno)
        )


print(
    f"Upstream relationships: "
    f"{sum(len(v) for v in upstream.values()):,}"
)


# ============================================================
# 3. LOAD NAMED RIVER LIST
# ============================================================

print("\n" + "=" * 60)
print("3. LOADING NAMED RIVERS")
print("=" * 60)


names = pd.read_excel(
    NAMES_FILE
)

print(
    f"Loaded {len(names):,} name records"
)


# Keep records that have both a name
# and an Outlet ID.

names = names.dropna(
    subset=[
        "River Name",
        "Outlet ID"
    ]
).copy()


# Clean names

names["River Name"] = (
    names["River Name"]
    .astype(str)
    .str.strip()
)


# Clean outlet IDs

names["Outlet ID"] = pd.to_numeric(
    names["Outlet ID"],
    errors="coerce"
)

names = names.dropna(
    subset=["Outlet ID"]
)

names["Outlet ID"] = (
    names["Outlet ID"]
    .astype("int64")
)


# Outlet LINKNO → River Name

named_outlets = dict(
    zip(
        names["Outlet ID"],
        names["River Name"]
    )
)


# Only retain named reaches actually
# present in GEOGloWS.

named_outlets = {
    linkno: name
    for linkno, name in named_outlets.items()
    if linkno in network_ids
}


print(
    f"Named river reaches in network: "
    f"{len(named_outlets):,}"
)


# ============================================================
# 4. LOAD OUTLET LOOKUPS
# ============================================================

print("\n" + "=" * 60)
print("4. LOADING HYDROBASIN OUTLETS")
print("=" * 60)


with open(
    OUTLET_LOOKUP_FILE,
    "r"
) as f:

    outlet_lookup = json.load(f)


with open(
    OUTLET_NAMES_FILE,
    "r"
) as f:

    outlet_names = json.load(f)


print(
    f"Hydrobasin outlets: "
    f"{len(outlet_lookup):,}"
)


# ============================================================
# 5. IDENTIFY CURRENTLY UNNAMED OUTLETS
# ============================================================

print("\n" + "=" * 60)
print("5. FINDING CURRENTLY UNNAMED OUTLETS")
print("=" * 60)


unnamed_outlets = []


for hybas_id, lookup in outlet_lookup.items():

    river_id = int(
        lookup["riverID"]
    )


    # Look at the result from our existing
    # downstream naming algorithm.

    result = outlet_names.get(
        str(hybas_id)
    )


    # No river name = currently unnamed

    if (
        result is None
        or not result.get("riverName")
    ):

        unnamed_outlets.append({

            "HYBAS_ID":
                str(hybas_id),

            "riverID":
                river_id

        })


print(
    f"Currently unnamed outlets: "
    f"{len(unnamed_outlets):,}"
)


# ============================================================
# 6. SEARCH UPSTREAM
# ============================================================

print("\n" + "=" * 60)
print("6. SEARCHING UPSTREAM FOR NAMED RIVERS")
print("=" * 60)


def find_nearest_named_upstream(
    start_linkno,
    max_steps=500
):

    """
    Search all upstream branches using BFS.

    Returns the first named river reach encountered.

    Because this is breadth-first search, the first
    result is the minimum number of network reaches
    upstream.
    """

    start_linkno = int(
        start_linkno
    )


    queue = deque([
        (start_linkno, 0)
    ])


    visited = {
        start_linkno
    }


    while queue:

        current, steps = (
            queue.popleft()
        )


        if steps >= max_steps:
            continue


        for upstream_link in (
            upstream.get(
                current,
                []
            )
        ):

            upstream_link = int(
                upstream_link
            )


            if upstream_link in visited:
                continue


            visited.add(
                upstream_link
            )


            new_steps = steps + 1


            # ------------------------------------------------
            # FOUND A NAMED REACH
            # ------------------------------------------------

            if upstream_link in named_outlets:

                return {

                    "matchedLINKNO":
                        upstream_link,

                    "riverName":
                        named_outlets[
                            upstream_link
                        ],

                    "steps":
                        new_steps

                }


            queue.append(
                (
                    upstream_link,
                    new_steps
                )
            )


    return None


# ============================================================
# 7. RUN DIAGNOSTIC
# ============================================================

upstream_matches = []


for i, outlet in enumerate(
    unnamed_outlets,
    start=1
):

    result = (
        find_nearest_named_upstream(
            outlet["riverID"],
            max_steps=500
        )
    )


    if result:

        upstream_matches.append({

            "HYBAS_ID":
                outlet["HYBAS_ID"],

            "riverID":
                outlet["riverID"],

            "matchedLINKNO":
                result[
                    "matchedLINKNO"
                ],

            "riverName":
                result[
                    "riverName"
                ],

            "steps":
                result[
                    "steps"
                ]

        })


    if i % 50 == 0:

        print(
            f"Checked "
            f"{i:,} / "
            f"{len(unnamed_outlets):,}"
        )


# ============================================================
# 8. RESULTS
# ============================================================

print("\n" + "=" * 60)
print("UPSTREAM MATCH RESULTS")
print("=" * 60)


print(
    f"Unnamed outlets checked: "
    f"{len(unnamed_outlets):,}"
)


print(
    f"Named river found upstream: "
    f"{len(upstream_matches):,}"
)


if upstream_matches:

    distances = [
        x["steps"]
        for x in upstream_matches
    ]


    print("\nDistance statistics:")

    print(
        pd.Series(
            distances
        ).describe()
    )


# ============================================================
# 9. DISTANCE DISTRIBUTION
# ============================================================

distance_bins = {

    "1–10 reaches": 0,

    "11–50 reaches": 0,

    "51–100 reaches": 0,

    "101–300 reaches": 0,

    "301–500 reaches": 0

}


for match in upstream_matches:

    steps = match["steps"]


    if steps <= 10:

        distance_bins[
            "1–10 reaches"
        ] += 1


    elif steps <= 50:

        distance_bins[
            "11–50 reaches"
        ] += 1


    elif steps <= 100:

        distance_bins[
            "51–100 reaches"
        ] += 1


    elif steps <= 300:

        distance_bins[
            "101–300 reaches"
        ] += 1


    else:

        distance_bins[
            "301–500 reaches"
        ] += 1


print(
    "\nDistance distribution:"
)


for category, count in (
    distance_bins.items()
):

    percent = (
        count /
        len(unnamed_outlets)
        * 100
    )


    print(
        f"{category:<20}"
        f"{count:>5} "
        f"({percent:5.1f}%)"
    )


# ============================================================
# 10. SHOW CLOSEST EXAMPLES
# ============================================================

print("\n" + "=" * 60)
print("CLOSEST UPSTREAM MATCHES")
print("=" * 60)


upstream_matches_sorted = sorted(
    upstream_matches,
    key=lambda x: x["steps"]
)


for match in (
    upstream_matches_sorted[:30]
):

    print(
        f"{match['HYBAS_ID']} "
        f"riverID={match['riverID']} "
        f"→ {match['riverName']} "
        f"(matched LINKNO="
        f"{match['matchedLINKNO']}, "
        f"{match['steps']} upstream steps)"
    )