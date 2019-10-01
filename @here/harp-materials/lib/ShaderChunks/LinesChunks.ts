/*
 * Copyright (C) 2017-2019 HERE Europe B.V.
 * Licensed under Apache 2.0, see full license in LICENSE
 * SPDX-License-Identifier: Apache-2.0
 */

export default {
    extrude_line_vert_func: `
vec3 extrudeLine(vec3 vertexPosition, float linePosition, float lineWidth, vec4 bt, vec3 t, inout vec2 uv) {
    vec3 result = vertexPosition;
    if (bt.w != 0.0) {
        result += uv.y * lineWidth * bt.xyz / cos(bt.w / 2.0);
        uv.x = linePosition + uv.x * lineWidth * uv.y * tan(bt.w / 2.0);
    }
    else {
        result += uv.y * lineWidth * bt.xyz + uv.x * lineWidth * t;
        uv.x = linePosition + uv.x * lineWidth;
    }
    uv.y *= lineWidth;
    return result;
}
`,
    join_dist_func: `
float joinDist(vec2 segment, vec2 texcoord) {
    float d = abs(texcoord.y);
    float dx = texcoord.x;
    if (dx < segment.x) {
        d = max(d, length(texcoord - vec2(segment.x, 0.0)));
    } else if (dx > segment.y) {
        d = max(d, length(texcoord - vec2(segment.y, 0.0)));
    }
    return d;
}
`,
    round_edges_and_add_caps: `
float roundEdgesAndAddCaps(in vec2 coords, in float extrusionStrength) {

    float dist = 0.0;

    #if defined(CAPS_NONE)
        dist = abs(coords.y);
        if (coords.x > 1.0 || coords.x < 0.0) {
            dist = 2.0;
        }
    #elif defined(CAPS_SQUARE)
        if (lineEnds > 0.0 && vExtrusionStrength < 1.0) {
            dist = max(abs(uv.y), lineEnds);
        } else {
            dist = joinDist(segment, uv);
        }
    #elif defined(CAPS_TRIANGLE_OUT)
        if (lineEnds > 0.0 && vExtrusionStrength < 1.0) {
            dist = (abs(uv.y)) + lineEnds;
        } else {
            dist = joinDist(segment, uv);
        }
    #elif defined(CAPS_TRIANGLE_IN)
        if (lineEnds > 0.0 && vExtrusionStrength < 1.0) {
            float y = abs(uv.y);
            dist = max(y, (lineEnds-y) + lineEnds);
        } else {
            dist = joinDist(segment, uv);
        }
    #else
        dist = abs(coords.y);
        if (coords.x > 1.0) {
            vec2 a = vec2((coords.x - 1.0) / extrusionStrength, coords.y);
            dist = max(dist, length(a));
        }
        else if (coords.x < 0.0) {
            vec2 a = vec2(coords.x / extrusionStrength, coords.y);
            dist = max(dist, length(a));
        }
    #endif

    return dist;
}
`,
    tile_clip_func: `
void tileClip(vec2 tilePos, vec2 tileSize) {
    if (tileSize.x > 0.0 && (tilePos.x < -tileSize.x / 2.0 || tilePos.x > tileSize.x / 2.0))
        discard;
    if (tileSize.y > 0.0 && (tilePos.y < -tileSize.y / 2.0 || tilePos.y > tileSize.y / 2.0))
        discard;
}
`,
    high_precision_vert_func: `
vec3 subtractDblEyePos( const in vec3 pos ) {
    vec3 t1 = positionLow - u_eyepos_lowpart;
    vec3 e = t1 - positionLow;
    vec3 t2 = ((-u_eyepos_lowpart - e) + (positionLow - (t1 - e))) + pos - u_eyepos;
    vec3 high_delta = t1 + t2;
    vec3 low_delta = t2 - (high_delta - t1);
    return (high_delta + low_delta);
}
`
};
