import { PlayerInputs, Ray, advanceRay, attachKeyboard, attachMouse, attachTouch, checkDestination, createRay, getCameraPlane, getMapCell, map, mapSize, updatePosition } from './demo1';
import { createSky, getBrightness, renderBackground } from './demo2';
import { WallMeasurements, getWallMeasurements, renderWall, textureSize } from './demo3';
import { Vec2, attachRenderFunction, initCanvas, loadTextureData } from './util';

export async function initDemo5() {
    const playerPos: Vec2 = {x: 2, y: 3};
    const playerDir: Vec2 = {x: 1, y: 0};
    const playerInputs: PlayerInputs = {
        moveForward: false,
        moveBackward: false,
        turnLeft: false,
        turnRight: false,
        rotationSpeed: 0,
    };

    const checkDest = (dest: Vec2) => checkDestination(dest, map, mapSize);

    const wallTexture: ImageData = await loadTextureData('/assets/content/misc/textures/wall.png');
    const floorTexture: ImageData = await loadTextureData('/assets/content/misc/textures/floor.png');

    const [canvas, ctx] = initCanvas('canvas5');
    const aspectRatio = canvas.width / canvas.height;
    const sky = createSky(canvas, ctx);
    const repaint = attachRenderFunction(canvas, dt => {
        updatePosition(dt, playerInputs, playerPos, playerDir, checkDest);
        renderBackground(canvas, ctx, sky);
        renderEnv(canvas, ctx, aspectRatio, playerPos, playerDir, wallTexture, floorTexture);
    });
    attachKeyboard(canvas, playerInputs);
    attachMouse(canvas, repaint, playerPos, playerDir, checkDest);
    attachTouch(canvas, repaint, playerPos, playerDir, checkDest);
}

export function renderEnv(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    aspectRatio: number,
    playerPos: Vec2,
    playerDir: Vec2,
    wallTexture: ImageData,
    floorTexture: ImageData,
) {
    const cameraPlane = getCameraPlane(playerDir);
    for (let x = 0; x < canvas.width; x++) {
        const ray = createRay(canvas, aspectRatio, playerPos, playerDir, x, cameraPlane);
        const stripe = ctx.getImageData(x, 0, 1, canvas.height);

        let yFloor = 0;
        const yFloorMax = canvas.height;

        while (true) {
            advanceRay(ray);
            const cell = getMapCell(map, ray.mapPos, mapSize)
            if (!cell) {
                break;
            }
            const wall = getWallMeasurements(ray, canvas.height, playerPos);
            const cellY = (canvas.height - wall.wallHeight) * 0.5;
            const floorCellY = Math.ceil(cellY);
            const floor = getFloorMeasurements(ray, wall);
            yFloor = renderFloor(canvas, stripe, floor, floorCellY, playerPos, yFloor, yFloorMax, ray.perpWallDist, floorTexture);

            if (cell.solid) {
                renderWall(canvas, stripe, ray, wall, wallTexture);
                break;
            }
        }
        ctx.putImageData(stripe, x, 0);
    }
}

export interface FloorMeasurements {
    floorXWall: number;
    floorYWall: number;
}

export function getFloorMeasurements(ray: Ray, wall: WallMeasurements): FloorMeasurements {
    let floorXWall: number, floorYWall: number;
    if (ray.side === 0 && ray.rayDir.x > 0) {
        floorXWall = ray.mapPos.x;
        floorYWall = ray.mapPos.y + wall.wallX;
    } else if (ray.side === 0 && ray.rayDir.x < 0) {
        floorXWall = ray.mapPos.x + 1;
        floorYWall = ray.mapPos.y + wall.wallX;
    } else if (ray.side === 1 && ray.rayDir.y > 0) {
        floorXWall = ray.mapPos.x + wall.wallX;
        floorYWall = ray.mapPos.y;
    } else {
        floorXWall = ray.mapPos.x + wall.wallX;
        floorYWall = ray.mapPos.y + 1;
    }
    return {floorXWall, floorYWall};
}

export function renderFloor(
    canvas: HTMLCanvasElement,
    stripe: ImageData,
    floor: FloorMeasurements,
    floorCellY: number,
    playerPos: Vec2,
    yFloor: number,
    yFloorMax: number,
    perpWallDist: number,
    floorTexture?: ImageData,
): number {
    if (!floorTexture) {
        return Math.max(yFloor, Math.min(floorCellY, yFloorMax));
    }
    while (yFloor < floorCellY && yFloor < yFloorMax) {
        const y = (canvas.height - yFloor - 1);
        mapFloorTexture(canvas, stripe, y, floor, playerPos, yFloor, perpWallDist, floorTexture);
        yFloor++;
    }
    return yFloor;
}

export function mapFloorTexture(
    canvas: HTMLCanvasElement,
    stripe: ImageData,
    y: number,
    floor: FloorMeasurements,
    playerPos: Vec2,
    yFloor: number,
    perpWallDist: number,
    floorTexture: ImageData,
) {
    const rowDistance = canvas.height / (canvas.height - 2 * yFloor);
    const weight = rowDistance / perpWallDist;
    const floorX = weight * floor.floorXWall + (1 - weight) * playerPos.x;
    const floorY = weight * floor.floorYWall + (1 - weight) * playerPos.y;
    let tx = ((textureSize.x * floorX) | 0) & (textureSize.x - 1);
    let ty = ((textureSize.y * floorY) | 0) & (textureSize.y - 1);
    const texOffset = (ty * textureSize.x + tx) * 4;
    const brightness = getBrightness(rowDistance);
    const offset = y * 4;
    stripe.data[offset] = floorTexture.data[texOffset] * brightness;
    stripe.data[offset + 1] = floorTexture.data[texOffset + 1] * brightness;
    stripe.data[offset + 2] = floorTexture.data[texOffset + 2] * brightness;
    stripe.data[offset + 3] = 255;
}
