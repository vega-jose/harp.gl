import { Vector3, Matrix3 } from "three";
import M = require("minimatch");

// TODO: Add test

interface WorldTileCorners {
    southEast: Vector3;
    southWest: Vector3;
    northWest: Vector3;
    northEast: Vector3;
}

function solveLinearSystem3x3(m: Matrix3, b: Vector3, result: Vector3 = new Vector3): Vector3 {
    // Solve linear system of 3 equations with 3 unknown variables using Cramer's rule.

    const mx = new Matrix3();
    // b.x, m[0].y, m[0].z,
    // b.y, m[1].y, m[1].z,
    // b.z, m[2].y, m[2].z);
    const my = new Matrix3();
    // m[0].x, b.x, m[0].z,
    // m[1].x, b.y, m[1].z,
    // m[2].x, b.z, m[2].z);
    const mz = new Matrix3();
    // m[0].x, m[0].y, b.x,
    // m[1].x, m[1].y, b.y,
    // m[2].x, m[2].y, b.z);

    result.set(mx.determinant(), my.determinant(), mz.determinant()).divideScalar(m.determinant());
    return result;
}

function approxMiddleControlPoint(a: Vector3, b: Vector3, result: Vector3 = new Vector3()): Vector3 {
    result.copy(a).add(b);
    result.normalize();

    result.multiplyScalar(a.dot(a) / result.dot(a));
    return result;
}

function approxMiddleControlPointLatitudal(a: Vector3, b: Vector3, result: Vector3 = new Vector3()): Vector3 {
    // #if HF_ASSERTS_ENABLED
    // // Assert that corners are properly oriented on Z-axis.
    // constexpr double equalEpsilon = 1e-8;
    // HF_ASSERT(math:: abs(a.z - b.z) < equalEpsilon);
    // #endif

    approxMiddleControlPoint(new Vector3(a.x, a.y, 0.0), new Vector3(b.x, b.y, 0.0), result);
    result.z = a.z;
    return result;
}

export function
    generateFlatPatch(ctrlPts: Vector3[], tileCorners: WorldTileCorners) {
    // p0 p1 -> 0 1 2
    // p2 p3    3 4 5
    //          6 7 8
    ctrlPts[0] = tileCorners.southWest;
    ctrlPts[2] = tileCorners.southEast;
    ctrlPts[6] = tileCorners.northWest;
    ctrlPts[8] = tileCorners.northEast;
    ctrlPts[1].copy(ctrlPts[0]).add(ctrlPts[2]).multiplyScalar(0.5);
    ctrlPts[3].copy(ctrlPts[0]).add(ctrlPts[6]).multiplyScalar(0.5);
    ctrlPts[5].copy(ctrlPts[2]).add(ctrlPts[8]).multiplyScalar(0.5);
    ctrlPts[7].copy(ctrlPts[6]).add(ctrlPts[8]).multiplyScalar(0.5);
    ctrlPts[4].copy(ctrlPts[3]).add(ctrlPts[5]).multiplyScalar(0.5);
}

export function generateSphericalPatchApproximation(ctrlPts: Vector3[], tileCorners: WorldTileCorners) {
    // 0 1 2
    // 3 4 5
    // 6 7 8
    ctrlPts[0] = tileCorners.southWest;
    ctrlPts[2] = tileCorners.southEast;
    ctrlPts[6] = tileCorners.northWest;
    ctrlPts[8] = tileCorners.northEast;

    // Generate control points [1] and [7] at planes perpendicular
    // to south-north pole direction, so the boundary curve lies on circle of latitude.
    const c1 = approxMiddleControlPointLatitudal(ctrlPts[0], ctrlPts[2]);
    const c7 = approxMiddleControlPointLatitudal(ctrlPts[6], ctrlPts[8]);

    // Generate control points [3] and [5] at planes interesecting
    // great circles between [0],[6] and [2],[8] respectively.
    const c3 = approxMiddleControlPoint(ctrlPts[0], ctrlPts[6]);
    const c5 = approxMiddleControlPoint(ctrlPts[2], ctrlPts[8]);

    // Last control point is on the intersection of 4 planes
    // where ever plane is perpendicular to sphere surface at one
    // of extreme points p0, p1, p2, p3.
    // We can pick any 3 that are not pair-wise equal.
    const n0 = ctrlPts[0].clone().normalize();
    const n1 = ctrlPts[2].clone().normalize();
    const n2 = ctrlPts[6].clone().normalize();
    const n3 = ctrlPts[8].clone().normalize();
    const l0 = n0.clone().sub(n1).length();
    const l1 = n2.clone().sub(n3).length();
    const n4 = l0 > l1
        ? solveLinearSystem3x3(new Matrix3(n0, n1, n2), new Vector3(1))
        : solveLinearSystem3x3(new Matrix3(n0, n2, n3), new Vector3(1));
    const c4 = n4.multiply(n0);

    ctrlPts[1] = c1;
    ctrlPts[3] = c3;
    ctrlPts[5] = c5;
    ctrlPts[7] = c7;
    ctrlPts[4] = c4;
}

math:: Vector3d
evaluate(const WorldControlPoints& ctrlPts, const math:: Vector2d& uv, math:: Vector3d * retNormal)
{
    // This is equivalent to GLSL version in Map2dTerrain.shader.

    // 0 1 2
    // 3 4 5
    // 6 7 8
    const auto c0 = ctrlPts[0];
    const auto c2 = ctrlPts[2];
    const auto c6 = ctrlPts[6];
    const auto c8 = ctrlPts[8];
    const auto c1_2 = 2. * ctrlPts[1];
    const auto c3_2 = 2. * ctrlPts[3];
    const auto c5_2 = 2. * ctrlPts[5];
    const auto c7_2 = 2. * ctrlPts[7];
    const auto c4_4 = 4. * ctrlPts[4];

    // Position evalulation.
    const auto ru = 1. - uv.x;
    const auto rv = 1. - uv.y;
    const auto uu = uv.x * uv.x;
    const auto uru = uv.x * ru;
    const auto ruru = ru * ru;
    const auto vv = uv.y * uv.y;
    const auto vrv = uv.y * rv;
    const auto rvrv = rv * rv;
    const auto c012 = c0 * ruru + c1_2 * uru + c2 * uu;
    const auto c345 = c3_2 * ruru + c4_4 * uru + c5_2 * uu;
    const auto c678 = c6 * ruru + c7_2 * uru + c8 * uu;
    const auto position = rvrv * c012 + vrv * c345 + vv * c678;

    if (retNormal) {
        // Normal calculation (cross product of partial derivatives).
        const auto duu = 2. * uv.x;
        const auto duru = 1. - duu;
        const auto druru = duu - 2.;
        const auto dvv = 2. * uv.y;
        const auto dvrv = 1. - dvv;
        const auto drvrv = dvv - 2.;
        const auto du = rvrv * (c0 * druru + c1_2 * duru + c2 * duu) +
            vrv * (c3_2 * druru + c4_4 * duru + c5_2 * duu) +
            vv * (c6 * druru + c7_2 * duru + c8 * duu);
        const auto dv = drvrv * c012 + dvrv * c345 + dvv * c678;
        * retNormal = math:: normalize(math:: cross(du, dv));
    }

    return position;
}
