import {addProtocol} from "maplibre-gl";
import {fromArrayBuffer} from "geotiff";
import {whenStyleReady} from "./initMap.js";

export const RASTER_LAYER_ID = "hydrosos-status";

const PROTOCOL = "hydrosos";
const TILE_SIZE = 256;

// Half the circumference of the Web Mercator world, in metres
const MERCATOR_MAX = 20037508.342789244;
const MAX_ZOOM = 6;
let protocolRegistered = false;

// tifUrl -> Promise of the decoded raster, so the file is only fetched once
const rasters = new Map();

export async function addRasterLayer(map, tifUrl) {
  console.log("Loading TIFF:", tifUrl);
  if (!protocolRegistered) {
    addProtocol(PROTOCOL, handleTileRequest);
    protocolRegistered = true;
  }
  await loadRaster(tifUrl);
  await whenStyleReady(map);
  map.addSource(RASTER_LAYER_ID, {
    type: "raster",
    tiles: [`${PROTOCOL}://${encodeURIComponent(tifUrl)}/{z}/{x}/{y}`],
    tileSize: TILE_SIZE,
    minzoom: 0,
    maxzoom: MAX_ZOOM
  });

  map.addLayer({
    id: RASTER_LAYER_ID,
    type: "raster",
    source: RASTER_LAYER_ID,
    paint: {
      "raster-resampling": "nearest",
      "raster-fade-duration": 0
    }
  });
  console.log("Added raster layer");
  return RASTER_LAYER_ID;
}

async function handleTileRequest(params) {
  const {tifUrl, z, x, y} = parseTileUrl(params.url);
  const raster = await loadRaster(tifUrl);
  return {data: await encodePng(renderTile(raster, z, x, y))};
}

/** hydrosos://<encoded tif url>/{z}/{x}/{y} */
function parseTileUrl(url) {
  const parts = url.slice(`${PROTOCOL}://`.length).split("/");
  const y = Number(parts.pop());
  const x = Number(parts.pop());
  const z = Number(parts.pop());
  return {tifUrl: decodeURIComponent(parts.join("/")), z, x, y};
}

function loadRaster(tifUrl) {
  if (!rasters.has(tifUrl)) rasters.set(tifUrl, decodeRaster(tifUrl));
  return rasters.get(tifUrl);
}

async function decodeRaster(tifUrl) {
  const response = await fetch(tifUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch TIFF: ${response.status}`);
  }

  const tiff = await fromArrayBuffer(await response.arrayBuffer());
  const image = await tiff.getImage();
  const geoKeys = await image.getGeoKeys();
  const epsg = geoKeys?.ProjectedCSTypeGeoKey ?? geoKeys?.GeographicTypeGeoKey;

  if (epsg !== 4326 && epsg !== 3857) {
    throw new Error(
      `TIFF is EPSG:${epsg}; only 4326 and 3857 are handled`
    );
  }

  const width = image.getWidth();
  const height = image.getHeight();
  const [xmin, ymin, xmax, ymax] = image.getBoundingBox();
  const raster = {
    epsg,
    width,
    height,
    xmin,
    ymax,
    pixelWidth: (xmax - xmin) / width,
    pixelHeight: (ymax - ymin) / height,
    samples: image.getSamplesPerPixel(),
    pixels: await image.readRasters({interleave: true})
  };
  console.log(`Decoded raster: ${width}x${height}, EPSG:${epsg}, ${raster.samples} bands`);
  return raster;
}

function renderTile(raster, z, x, y) {
  const worldSize = TILE_SIZE * 2 ** z;

  const columns = new Int32Array(TILE_SIZE);
  for (let px = 0; px < TILE_SIZE; px++) {
    const fraction = (x * TILE_SIZE + px + 0.5) / worldSize;
    const position =
      raster.epsg === 3857
        ? fraction * 2 * MERCATOR_MAX - MERCATOR_MAX
        : fraction * 360 - 180;

    columns[px] = Math.floor((position - raster.xmin) / raster.pixelWidth);
  }

  const rows = new Int32Array(TILE_SIZE);

  for (let py = 0; py < TILE_SIZE; py++) {
    const fraction = (y * TILE_SIZE + py + 0.5) / worldSize;

    const position =
      raster.epsg === 3857
        ? MERCATOR_MAX - fraction * 2 * MERCATOR_MAX
        : // Inverse Web Mercator: this is the step that stretches the
          // equirectangular source out towards the poles
        (Math.atan(Math.sinh(Math.PI - 2 * Math.PI * fraction)) * 180) /
        Math.PI;

    rows[py] = Math.floor((raster.ymax - position) / raster.pixelHeight);
  }

  const tile = new ImageData(TILE_SIZE, TILE_SIZE);

  for (let py = 0; py < TILE_SIZE; py++) {
    const row = rows[py];

    if (row < 0 || row >= raster.height) continue;

    for (let px = 0; px < TILE_SIZE; px++) {
      const column = columns[px];

      if (column < 0 || column >= raster.width) continue;

      const from = (row * raster.width + column) * raster.samples;

      const red = raster.pixels[from];
      const green = raster.pixels[from + 1];
      const blue = raster.pixels[from + 2];

      // Black is the raster's nodata fill, so leave it fully transparent
      if (red === 0 && green === 0 && blue === 0) continue;

      const to = (py * TILE_SIZE + px) * 4;

      tile.data[to] = red;
      tile.data[to + 1] = green;
      tile.data[to + 2] = blue;
      tile.data[to + 3] = 255;
    }
  }

  return tile;
}

async function encodePng(tile) {
  const canvas = new OffscreenCanvas(TILE_SIZE, TILE_SIZE);
  canvas.getContext("2d").putImageData(tile, 0, 0);
  const blob = await canvas.convertToBlob({type: "image/png"});
  return blob.arrayBuffer();
}

export async function setRasterTif(map, tifUrl) {
  await loadRaster(tifUrl); // decode (or hit cache) before tiles are requested
  const source = map.getSource(RASTER_LAYER_ID);
  if (!source) {
    throw new Error("Raster source not initialized — call addRasterLayer first.");
  }
  source.setTiles([`${PROTOCOL}://${encodeURIComponent(tifUrl)}/{z}/{x}/{y}`]);
}
