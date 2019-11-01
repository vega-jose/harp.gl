/*
 * Copyright (C) 2017-2019 HERE Europe B.V.
 * Licensed under Apache 2.0, see full license in LICENSE
 * SPDX-License-Identifier: Apache-2.0
 */

import { GeoCoordinates } from "@here/harp-geoutils";
import { MapControls, MapControlsUI } from "@here/harp-map-controls";
import { CopyrightElementHandler, MapView } from "@here/harp-mapview";
import { APIFormat, OmvDataSource } from "@here/harp-omv-datasource";
import { accessToken, copyrightInfo } from "../config";

/**
 * This example shows how to extend a Theme file and
 * ```typescript
 * [[include:berlin_public_transport.json]]
 * ```
 *
 */
export namespace PublicTransportExample {
    function initializeMapView(id: string): MapView {
        const canvas = document.getElementById(id) as HTMLCanvasElement;

        // snippet:harp_gl_hello_world_example_1.ts
        const map = new MapView({
            canvas,
            theme: "resources/berlin_tilezen_public_transport_day.json"
        });
        // end:harp_gl_hello_world_example_1.ts

        CopyrightElementHandler.install("copyrightNotice", map);

        const mapControls = new MapControls(map);

        const HEREBerlin = new GeoCoordinates(52.5308419, 13.3850719);
        map.lookAt(HEREBerlin, 3500, 50, -20);

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

        addOsmDataSource(map);

        return map;
    }

    function addOsmDataSource(map: MapView) {
        const omvDataSource = new OmvDataSource({
            name: "osmbase",
            baseUrl: "https://xyz.api.here.com/tiles/osmbase/512/all",
            apiFormat: APIFormat.XYZMVT,
            createTileInfo: false,
            styleSetName: "tilezen",
            maxZoomLevel: 16,
            authenticationCode: accessToken
        });

        map.addDataSource(omvDataSource);

        return map;
    }

    export const mapView = initializeMapView("mapCanvas");
}
