/*
 * Copyright (C) 2017-2019 HERE Europe B.V.
 * Licensed under Apache 2.0, see full license in LICENSE
 * SPDX-License-Identifier: Apache-2.0
 */

import { MapEnv, ValueMap } from "@here/harp-datasource-protocol/lib/Env";
import { GeoCoordinates, GeoPointLike, webMercatorProjection } from "@here/harp-geoutils";
import { ILogger } from "@here/harp-utils";
import { IGeometryProcessor, ILineGeometry, IPolygonGeometry } from "./IGeometryProcessor";
import { OmvFeatureFilter } from "./OmvDataFilter";
import { OmvDataAdapter, OmvDecoder } from "./OmvDecoder";
import { isArrayBufferLike, world2tile } from "./OmvUtils";

import * as THREE from "three";

const DEFAULT_EXTENTS = 4 * 1024;

type GeoJsonGeometry =
    | GeoJsonLineStringGeometry
    | GeoJsonMultiLineStringGeometry
    | GeoJsonPolygonGeometry
    | GeoJsonMultiPolygonGeometry
    | GeoJsonPointGeometry
    | GeoJsonMultiPointGeometry;

interface GeoJsonContainer {
    [layer: string]: GeoJsonFeatureCollection;
}

interface GeoJsonLineStringGeometry {
    type: "LineString";
    coordinates: GeoPointLike[];
}

interface GeoJsonMultiLineStringGeometry {
    type: "MultiLineString";
    coordinates: GeoPointLike[][];
}

interface GeoJsonPointGeometry {
    type: "Point";
    coordinates: GeoPointLike;
}

interface GeoJsonMultiPointGeometry {
    type: "MultiPoint";
    coordinates: GeoPointLike[];
}

interface GeoJsonPolygonGeometry {
    type: "Polygon";
    coordinates: GeoPointLike[][];
}

interface GeoJsonMultiPolygonGeometry {
    type: "MultiPolygon";
    coordinates: GeoPointLike[][][];
}

interface GeoJsonFeature {
    id?: string;
    properties: ValueMap;
    geometry: GeoJsonGeometry;
}

interface GeoJsonFeatureCollection {
    features: GeoJsonFeature[];
}

function convertGeometryType(type: string): string {
    switch (type) {
        case "LineString":
            return "line";
        case "MultiLineString":
            return "line";
        case "Polygon":
            return "polygon";
        case "MultiPolygon":
            return "polygon";
        case "Point":
            return "point";
        case "MultiPoint":
            return "point";
        default:
            return "unknown";
    } // switch
}

const worldP = new THREE.Vector3();

/**
 * Converts a `geoPoint` to local tile space.
 *
 * @param geoPoint The input [[GeoPointLike]].
 * @param decodeInfo The [[OmvDecoder.DecodeInfo]].
 * @hidden
 */
function convertPoint(geoPoint: GeoPointLike, decodeInfo: OmvDecoder.DecodeInfo): THREE.Vector2 {
    return world2tile(
        DEFAULT_EXTENTS,
        decodeInfo,
        webMercatorProjection.projectPoint(GeoCoordinates.fromGeoPoint(geoPoint), worldP),
        true,
        new THREE.Vector2()
    );
}

function convertLineStringGeometry(
    coordinates: GeoPointLike[],
    decodeInfo: OmvDecoder.DecodeInfo
): ILineGeometry {
    const untiledPositions = coordinates.map(geoPoint => {
        return GeoCoordinates.fromGeoPoint(geoPoint);
    });

    const positions = coordinates.map(geoPoint => convertPoint(geoPoint, decodeInfo));

    return { untiledPositions, positions };
}

function convertLineGeometry(
    geometry: GeoJsonLineStringGeometry | GeoJsonMultiLineStringGeometry,
    decodeInfo: OmvDecoder.DecodeInfo
): ILineGeometry[] {
    if (geometry.type === "LineString") {
        return [convertLineStringGeometry(geometry.coordinates, decodeInfo)];
    }

    return geometry.coordinates.map(lineString =>
        convertLineStringGeometry(lineString, decodeInfo)
    );
}

function convertRings(
    coordinates: GeoPointLike[][],
    decodeInfo: OmvDecoder.DecodeInfo
): IPolygonGeometry {
    const rings = coordinates.map(ring => {
        const { positions } = convertLineStringGeometry(ring, decodeInfo);
        return positions;
    });
    return { rings };
}

function convertPolygonGeometry(
    geometry: GeoJsonPolygonGeometry | GeoJsonMultiPolygonGeometry,
    decodeInfo: OmvDecoder.DecodeInfo
): IPolygonGeometry[] {
    if (geometry.type === "Polygon") {
        return [convertRings(geometry.coordinates, decodeInfo)];
    }

    return geometry.coordinates.map(polygon => convertRings(polygon, decodeInfo));
}

function convertPointGeometry(
    geometry: GeoJsonPointGeometry | GeoJsonMultiPointGeometry,
    decodeInfo: OmvDecoder.DecodeInfo
): THREE.Vector2[] {
    if (geometry.type === "Point") {
        return [convertPoint(geometry.coordinates, decodeInfo)];
    }

    return geometry.coordinates.map(geoPoint => convertPoint(geoPoint, decodeInfo));
}

export class TiledGeoJsonDataAdapter implements OmvDataAdapter {
    id = "TiledGeoJsonAdapeter";

    constructor(processor: IGeometryProcessor, dataFilter?: OmvFeatureFilter, logger?: ILogger);

    constructor(
        readonly m_processor: IGeometryProcessor,
        private m_dataFilter?: OmvFeatureFilter,
        readonly m_logger?: ILogger
    ) {}

    get dataFilter(): OmvFeatureFilter | undefined {
        return this.m_dataFilter;
    }

    set dataFilter(dataFilter: OmvFeatureFilter | undefined) {
        this.m_dataFilter = dataFilter;
    }

    canProcess(data: ArrayBufferLike | {}): boolean {
        if (isArrayBufferLike(data)) {
            return false;
        }

        const layers = data as GeoJsonContainer;
        const layerNames = Object.keys(layers);

        // TODO: find a better way to detect tiled GeoJson.
        for (const layerName of layerNames) {
            const featureCollection = layers[layerName];

            if (featureCollection.features === undefined) {
                return false;
            }
        }

        return true;
    }

    process(layers: GeoJsonContainer, decodeInfo: OmvDecoder.DecodeInfo) {
        const tileKey = decodeInfo.tileKey;
        const layerNames = Object.keys(layers);

        for (const layerName of layerNames) {
            const featureCollection = layers[layerName];

            for (const feature of featureCollection.features) {
                const env = new MapEnv({
                    ...feature.properties,
                    $layer: layerName,
                    $geometryType: convertGeometryType(feature.geometry.type),
                    $level: tileKey.level,
                    $zoom: Math.max(0, tileKey.level - (this.m_processor.storageLevelOffset || 0))
                });

                switch (feature.geometry.type) {
                    case "LineString":
                    case "MultiLineString": {
                        const geometry = convertLineGeometry(feature.geometry, decodeInfo);
                        this.m_processor.processLineFeature(
                            layerName,
                            DEFAULT_EXTENTS,
                            geometry,
                            env,
                            tileKey.level
                        );
                        break;
                    }
                    case "Polygon":
                    case "MultiPolygon": {
                        const geometry = convertPolygonGeometry(feature.geometry, decodeInfo);
                        this.m_processor.processPolygonFeature(
                            layerName,
                            DEFAULT_EXTENTS,
                            geometry,
                            env,
                            tileKey.level
                        );
                        break;
                    }
                    case "Point":
                    case "MultiPoint": {
                        const geometry = convertPointGeometry(feature.geometry, decodeInfo);
                        this.m_processor.processPointFeature(
                            layerName,
                            DEFAULT_EXTENTS,
                            geometry,
                            env,
                            tileKey.level
                        );
                        break;
                    }
                }
            }
        }
    }
}
