/*
 * Copyright (C) 2017-2019 HERE Europe B.V.
 * Licensed under Apache 2.0, see full license in LICENSE
 * SPDX-License-Identifier: Apache-2.0
 */

import { GeoCoordinates } from "@here/harp-geoutils";
import {
    MapAnchor,
    MapView,
    MapViewUtils,
    MapViewEventNames,
    RenderEvent
} from "@here/harp-mapview";
import * as THREE from "three";
import { HelloWorldExample } from "./getting-started_hello-world_npm";

import "three/examples/jsm/objects/Water";
import { now } from "@tweenjs/tween.js";

/**
 * This example builds on top of the [[ThreejsAddSimpleObject]], so please consult that first for
 * any questions regarding basic setup of the map and adding three.js objects to the scene.
 *
 * This example shows how to add a [THREE.js](https://threejs.org/) text geometry to the scene.
 *
 */
export namespace ThreejsAddText {
    interface Slide {
        location: GeoCoordinates;
        tilt: number;
        azimuth: number;
        distance: number;
    }

    const slides: Slide[] = [
        // {
        //     // Lisbon
        //     location: new GeoCoordinates(38.7684705, -9.0942402),
        //     tilt: 0,
        //     azimuth: 0,
        //     distance: 1000
        // },

        {
            // HERE Berlin
            location: new GeoCoordinates(52.5308419, 13.3850719),
            tilt: 70,
            azimuth: 0,
            distance: 3000
        },
        {
            // Museumsinsel Berlin
            location: new GeoCoordinates(52.5169285, 13.4010829),
            tilt: 45,
            azimuth: 45,
            distance: 300
        },
        {
            location: new GeoCoordinates(52.5208543, 13.4094943),
            tilt: 10,
            azimuth: 0,
            distance: 1000
        }
    ];

    let currentSlide = 0;

    // Create a new MapView for the HTMLCanvasElement of the given id.
    function addTextGeometry(mapView: MapView) {
        mapView.renderLabels = false;
        const loader = new THREE.FontLoader();
        loader.load("resources/Fira_Sans_Light_Regular.json", font => {
            const textGeometry = new THREE.TextBufferGeometry("3d web map rendering engine", {
                font,
                size: 100,
                height: 20,
                curveSegments: 12,
                bevelThickness: 2,
                bevelSize: 5,
                bevelEnabled: true
            });
            textGeometry.computeBoundingBox();

            const logoGeometry = new THREE.TextBufferGeometry("harp.gl", {
                font,
                size: 500,
                height: 20,
                curveSegments: 12,
                bevelThickness: 2,
                bevelSize: 5,
                bevelEnabled: true
            });
            logoGeometry.computeBoundingBox();
            const center = new THREE.Vector3()
                .copy(logoGeometry.boundingBox.max)
                .sub(logoGeometry.boundingBox.min)
                .multiplyScalar(-0.5);
            const logoMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color("rgb(72,218,208)"),
                emissive: "#404040"
            });

            const textMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color("#ffffff"),
                emissive: "#404040"
            });

            const anchor = new THREE.Object3D() as MapAnchor<THREE.Object3D>;
            anchor.geoPosition = slides[0].location;

            const logoMesh = new THREE.Mesh(logoGeometry, logoMaterial);
            logoMesh.name = "harp.gl_text";
            logoMesh.position.set(center.x, 0, 180);
            logoMesh.renderOrder = 10000;
            logoMesh.rotateX(Math.PI / 2);
            anchor.add(logoMesh);

            const textMesh = new THREE.Mesh(textGeometry, textMaterial);
            textMesh.name = "text";
            textMesh.position.set(center.x + 80, -200, 60);
            textMesh.renderOrder = 10000;
            textMesh.rotateX(Math.PI / 2);
            anchor.add(textMesh);

            mapView.mapAnchors.add(anchor);
            mapView.update();
        });
    }

    const message = document.createElement("div");
    message.innerHTML = "Mesh generated with THREE.JS TextBufferGeometry.";

    message.style.position = "absolute";
    message.style.cssFloat = "right";
    message.style.top = "10px";
    message.style.right = "10px";
    document.body.appendChild(message);

    addTextGeometry(HelloWorldExample.mapView);

    function setLocation(
        mapView: MapView,
        target: GeoCoordinates,
        tilt: number,
        azimuth: number,
        distance: number
    ) {
        MapViewUtils.getCameraPositionFromTargetCoordinates(
            target,
            distance,
            0,
            0,
            mapView.projection,
            mapView.camera.position
        );

        MapViewUtils.getCameraRotation(
            mapView.projection,
            target,
            azimuth,
            tilt,
            mapView.camera.quaternion
        );
    }

    function startTransition(
        mapView: MapView,
        target: GeoCoordinates,
        tilt: number,
        azimuth: number,
        distance: number
    ) {
        const startPosition = mapView.camera.position.clone();
        const startQuaternion = mapView.camera.quaternion.clone();
        const targetPosition = MapViewUtils.getCameraPositionFromTargetCoordinates(
            target,
            distance,
            azimuth,
            tilt,
            mapView.projection
        );

        const targetQuaternion = MapViewUtils.getCameraRotation(
            mapView.projection,
            target,
            azimuth,
            tilt
        );

        const startTime = Date.now();

        const middlePosition = startPosition
            .clone()
            .add(targetPosition)
            .multiplyScalar(0.5);
        middlePosition.setZ(
            startPosition
                .clone()
                .sub(targetPosition)
                .length()
        );
        // const curve = new THREE.QuadraticBezierCurve3(
        //     startPosition,
        //     middlePosition,
        //     targetPosition
        // );
        const curve = new THREE.CatmullRomCurve3([startPosition, middlePosition, targetPosition]);

        const updateListener = () => {
            const time = Date.now();
            let t = (time - startTime) / 1000;

            if (t >= 1) {
                t = 1;
                mapView.endAnimation();
                mapView.removeEventListener(MapViewEventNames.Render, updateListener);
            }
            mapView.camera.position.copy(curve.getPoint(t));
            const rotation = startQuaternion.clone().slerp(targetQuaternion, t);
            mapView.camera.quaternion.copy(rotation);
            mapView.camera.updateMatrixWorld(true);
        };

        mapView.addEventListener(MapViewEventNames.Render, updateListener);
        mapView.beginAnimation();
        mapView.update();
    }

    startTransition(
        HelloWorldExample.mapView,
        slides[0].location,
        slides[0].tilt,
        slides[0].azimuth,
        slides[0].distance
    );
    // (
    //         HelloWorldExample.mapView,
    //         slides[0].location,
    //         slides[0].tilt,
    //         slides[0].azimuth,
    //         slides[0].distance
    //     );
    window.onkeydown = (ev: KeyboardEvent) => {
        const oldSlide = slides[currentSlide];
        switch (ev.code) {
            case "ArrowLeft":
                currentSlide--;
                break;
            case "ArrowRight":
                currentSlide++;
                break;
        }
        if (currentSlide < 0) {
            currentSlide = 0;
        } else if (currentSlide >= slides.length) {
            currentSlide = slides.length - 1;
        }

        const newSlide = slides[currentSlide];
        if (oldSlide === newSlide) {
            return;
        }

        startTransition(
            HelloWorldExample.mapView,
            newSlide.location,
            newSlide.tilt,
            newSlide.azimuth,
            newSlide.distance
        );
    };
}
