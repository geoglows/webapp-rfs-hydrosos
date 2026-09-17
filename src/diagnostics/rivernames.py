import geopandas as gpd

gdb = "/Users/bethlarsen/Downloads/Hydro Lab/geoglows-v2-map-optimized.gdb"


print(gpd.list_layers(gdb))


rivers = gpd.read_file(
    gdb,
    layer="geoglowsv2",
    ignore_geometry=True
)

print(rivers.head())
print(rivers.columns.tolist())