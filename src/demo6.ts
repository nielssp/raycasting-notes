import { PlayerInputs, advanceRay, attachKeyboard, attachMouse, attachTouch, checkDestination, createRay, getCameraPlane, getMapCell, map, mapSize, updatePosition } from './demo1';
import { getBrightness } from './demo2';
import { getWallMeasurements, renderWall, textureSize } from './demo3';
import { FloorMeasurements, getFloorMeasurements, renderFloor } from './demo5';
import { Vec2, attachRenderFunction, initCanvas, loadTextureData } from './util';

export async function initDemo6() {
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
    const ceilingTexture: ImageData = await loadTextureData('/assets/content/misc/textures/ceiling.png');

    const [canvas, ctx] = initCanvas('canvas6');
    const aspectRatio = canvas.width / canvas.height;
    const repaint = attachRenderFunction(canvas, dt => {
        updatePosition(dt, playerInputs, playerPos, playerDir, checkDest);
        renderEnv(canvas, ctx, aspectRatio, playerPos, playerDir, wallTexture, floorTexture, ceilingTexture);
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
    ceilingTexture: ImageData,
) {
    const cameraPlane = getCameraPlane(playerDir);
    for (let x = 0; x < canvas.width; x++) {
        const ray = createRay(canvas, aspectRatio, playerPos, playerDir, x, cameraPlane);
        const stripe = ctx.getImageData(x, 0, 1, canvas.height);

        let yFloor = 0;
        let yCeiling = 0;
        const yFloorMax = canvas.height;
        const yCeilingMax = yFloorMax;

        while (true) {
            advanceRay(ray);
            const cell = getMapCell(map, ray.mapPos, mapSize)
            if (!cell) {
                break;
            }
            const wall = getWallMeasurements(ray, canvas.height, playerPos);
            const cellY = (canvas.height - wall.wallHeight) * 0.5;
            const floorCellY = Math.ceil(cellY);
            const ceilingCellY = Math.ceil(cellY);
            const floor = getFloorMeasurements(ray, wall);
            yFloor = renderFloor(canvas, stripe, floor, floorCellY, playerPos, yFloor, yFloorMax, ray.perpWallDist, floorTexture);
            yCeiling = renderCeiling(canvas, stripe, floor, playerPos, ceilingCellY, yCeiling, yCeilingMax, ray.perpWallDist, ceilingTexture)

            if (cell.solid) {
                renderWall(canvas, stripe, ray, wall, wallTexture);
                break;
            }
        }
        ctx.putImageData(stripe, x, 0);
    }
}

export function renderCeiling(
    canvas: HTMLCanvasElement,
    stripe: ImageData,
    floor: FloorMeasurements,
    playerPos: Vec2,
    ceilingCellY: number,
    yCeiling: number,
    yCeilingMax: number,
    perpWallDist: number,
    ceilingTexture?: ImageData,
): number {
    if (!ceilingTexture) {
        return Math.max(yCeiling, Math.min(ceilingCellY, yCeilingMax));
    }
    while (yCeiling < ceilingCellY && yCeiling < yCeilingMax) {
        const rowDistance = canvas.height / (canvas.height - 2 * yCeiling);
        const weight = rowDistance / perpWallDist;
        const ceilingX = weight * floor.floorXWall + (1 - weight) * playerPos.x;
        const ceilingY = weight * floor.floorYWall + (1 - weight) * playerPos.y;
        let tx = ((textureSize.x * ceilingX) | 0) & (textureSize.x - 1);
        let ty = ((textureSize.y * ceilingY) | 0) & (textureSize.y - 1);
        const texOffset = (ty * textureSize.x + tx) * 4;
        const brightness = getBrightness(rowDistance);
        const offset = yCeiling * 4;
        stripe.data[offset] = ceilingTexture.data[texOffset] * brightness;
        stripe.data[offset + 1] = ceilingTexture.data[texOffset + 1] * brightness;
        stripe.data[offset + 2] = ceilingTexture.data[texOffset + 2] * brightness;
        stripe.data[offset + 3] = 255;
        yCeiling++;
    }
    return yCeiling;
}


