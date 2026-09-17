let basinSearchIndex = [];


export async function loadBasinSearchIndex() {

    const [basinResponse, namesResponse] =
        await Promise.all([
            fetch(`${import.meta.env.BASE_URL}basin_index.json`),
            fetch(`${import.meta.env.BASE_URL}outlet_names.json`)
        ]);

    if (!basinResponse.ok) {
        throw new Error(
            "Unable to load basin search index."
        );
    }

    if (!namesResponse.ok) {
        throw new Error(
            "Unable to load basin names."
        );
    }

    const bounds =
        await basinResponse.json();

    const names =
        await namesResponse.json();


    basinSearchIndex =
        Object.keys(bounds).map(hybasId => {

            const basinName =
                names[hybasId]?.riverName ?? null;

            return {
                hybasId,
                name: basinName
            };

        });


    return basinSearchIndex;
}


export function searchBasins(
    query,
    limit = 8
) {

    const normalized =
        query.trim().toLowerCase();

    if (!normalized) {
        return [];
    }


    return basinSearchIndex
        .filter(basin => {

            const idMatch =
                basin.hybasId
                    .toLowerCase()
                    .startsWith(normalized);

            const nameMatch =
                basin.name &&
                basin.name
                    .toLowerCase()
                    .startsWith(normalized);

            return idMatch || nameMatch;

        })
        .slice(0, limit);
}