/*
 * Copyright (C) 2017-2019 HERE Europe B.V.
 * Licensed under Apache 2.0, see full license in LICENSE
 * SPDX-License-Identifier: Apache-2.0
 */

import { GeoCoordinates, webMercatorTilingScheme } from "@here/harp-geoutils";
import { MapControls, MapControlsUI } from "@here/harp-map-controls";
import { CopyrightElementHandler, MapAnchor, MapView, TileFeatureData } from "@here/harp-mapview";
import { OmvDataSource } from "@here/harp-omv-datasource";
import { BufferGeometry, Mesh, MeshStandardMaterial } from "three";
import { accessToken, copyrightInfo } from "../config";

/**
 * MapView initialization sequence enables setting all the necessary elements on a map  and returns
 * a [[MapView]] object. Looking at the function's definition:
 *
 * ```typescript
 * function initializeMapView(id: string): MapView {
 * ```
 *
 * it can be seen that it accepts a string which holds an `id` of a DOM element to initialize the
 * map canvas within.
 *
 * ```typescript
 * [[include:harp_gl_hello_world_example_0.ts]]
 * ```
 *
 * During the initialization, canvas element with a given `id` is searched for first. Than a
 * [[MapView]] object is created and set to initial values of camera settings and map's geo center.
 *
 * ```typescript
 * [[include:harp_gl_hello_world_example_1.ts]]
 * ```
 * As a map needs controls to allow any interaction with the user (e.g. panning), a [[MapControls]]
 * object is created.
 *
 * ```typescript
 * [[include:harp_gl_hello_world_example_map_controls.ts]]
 * ```
 * By default the map is looking at Berlin. For this example we want to look at New York from a
 * nice angle and distance.
 * ```typescript
 * [[include:harp_gl_hello_world_example_look_at.ts]]
 * ```
 *
 * Finally the map is being resized to fill the whole screen and a listener for a "resize" event is
 * added, which enables adjusting the map's size to the browser's window size changes.
 *
 * ```typescript
 * [[include:harp_gl_hello_world_example_3.ts]]
 * ```
 * At the end of the initialization a [[MapView]] object is returned. To show map tiles an exemplary
 * datasource is used, [[OmvDataSource]]:
 *
 * ```typescript
 * [[include:harp_gl_hello_world_example_4.ts]]
 * ```
 *
 * After creating a specific datasource it needs to be added to the map in order to be seen.
 *
 * ```typescript
 * [[include:harp_gl_hello_world_example_5.ts]]
 * ```
 *
 */
export namespace HelloWorldExample {
    // Create a new MapView for the HTMLCanvasElement of the given id.
    function initializeMapView(id: string): MapView {
        // snippet:harp_gl_hello_world_example_0.ts
        const canvas = document.getElementById(id) as HTMLCanvasElement;
        // end:harp_gl_hello_world_example_0.ts

        // snippet:harp_gl_hello_world_example_1.ts
        const map = new MapView({
            canvas,
            theme: "resources/berlin_tilezen_base.json"
        });
        // end:harp_gl_hello_world_example_1.ts

        CopyrightElementHandler.install("copyrightNotice", map);

        // snippet:harp_gl_hello_world_example_map_controls.ts
        // Instantiate the default map controls, allowing the user to pan around freely.
        const mapControls = new MapControls(map);
        mapControls.maxTiltAngle = 50;
        // end:harp_gl_hello_world_example_map_controls.ts

        // snippet:harp_gl_hello_world_example_look_at.ts
        // Look at New York.
        const NY = new GeoCoordinates(40.707, -74.01);
        map.lookAt(NY, 3500, 50, -20);
        map.zoomLevel = 16.1;
        // end:harp_gl_hello_world_example_look_at.ts

        // Add an UI.
        const ui = new MapControlsUI(mapControls, { zoomLevel: "input" });
        canvas.parentElement!.appendChild(ui.domElement);

        // snippet:harp_gl_hello_world_example_3.ts
        // Resize the mapView to maximum.
        map.resize(window.innerWidth, window.innerHeight);

        // React on resize events.
        window.addEventListener("resize", () => {
            map.resize(window.innerWidth, window.innerHeight);
        });
        // end:harp_gl_hello_world_example_3.ts

        addOmvDataSource(map);

        canvas.addEventListener("mouseup", (ev: MouseEvent) => {
            while (map.mapAnchors.children.length > 0) {
                map.mapAnchors.remove(map.mapAnchors.children[0]);
            }

            const intersections = map.intersectMapObjects(ev.clientX, ev.clientY);
            // console.log(intersection);
            for (const i of intersections) {
                if (
                    i.intersection === undefined ||
                    i.intersection.faceIndex === undefined ||
                    i.intersection.face === undefined ||
                    i.intersection.face === null
                ) {
                    continue;
                }
                const face = i.intersection.face;
                let faceIndex = i.intersection.faceIndex * 3;
                let count = 3;
                const obj = i.intersection.object;
                const userData = obj.userData;
                if (userData.dataSource !== "omv-datasource") {
                    continue;
                }

                // Find the whole feature for the clicked face
                if (userData.feature !== undefined && userData.feature.starts !== undefined) {
                    const feature = userData.feature as TileFeatureData;

                    const startIndex = feature.starts!.findIndex(value => value > faceIndex);
                    faceIndex = feature.starts![startIndex - 1];
                    count = feature.starts![startIndex] - faceIndex;
                }
                if (
                    userData.dataSource === "omv-datasource" &&
                    userData.kind.includes("building")
                ) {
                    const mesh = obj as Mesh;
                    const bufferGeometry = mesh.geometry as BufferGeometry;
                    // bufferGeometry.clearGroups();
                    // bufferGeometry.addGroup(0, faceIndex, 0);
                    // bufferGeometry.addGroup(faceIndex, count, 1);
                    // bufferGeometry.addGroup(faceIndex + count, bufferGeometry.index.count, 0);

                    const material = Array.isArray(mesh.material)
                        ? mesh.material[0]
                        : mesh.material;
                    if (material.colorWrite === false) {
                        // We also get an intersection result for the depth-pre-pass. Ignore it.
                        continue;
                    }

                    //mesh.material = [material, material.clone()];
                    // const materials = mesh.material as Material[];
                    // (materials[1] as MeshStandardMaterial).color = new Color("#ff00ff");
                    // if (material.colorWrite === true) {
                    //     break;
                    // }

                    //FIXME: Don't clone the whole buffer but only copy the part that we need.
                    const newBufferGeometry = bufferGeometry.clone();
                    const newMaterial = material.clone();
                    (newMaterial as MeshStandardMaterial).color.set("#ff00ff");
                    (newMaterial as MeshStandardMaterial).depthTest = false;
                    const mapAnchor: MapAnchor<Mesh> = new Mesh(newBufferGeometry, newMaterial);

                    mapAnchor.geoPosition = webMercatorTilingScheme.getGeoBox(
                        userData.tileKey
                    ).center;
                    mapAnchor.geoPosition.altitude = 500;
                    mapAnchor.renderOrder = 1000000;
                    map.mapAnchors.add(mapAnchor);
                    console.log(map.mapAnchors);
                }
            }
        });

        return map;
    }

    function addOmvDataSource(map: MapView) {
        // snippet:harp_gl_hello_world_example_4.ts
        const omvDataSource = new OmvDataSource({
            url: "https://xyz.api.here.com/tiles/herebase.02/{z}/{x}/{y}/omv",
            styleSetName: "tilezen",
            maxZoomLevel: 17,
            urlParams: {
                access_token: accessToken
            },
            copyrightInfo,
            gatherFeatureIds: true
        });
        // end:harp_gl_hello_world_example_4.ts

        // snippet:harp_gl_hello_world_example_5.ts
        map.addDataSource(omvDataSource);
        // end:harp_gl_hello_world_example_5.ts

        return map;
    }

    export const mapView = initializeMapView("mapCanvas");
}
