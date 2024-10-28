import { PlayerInputs, advanceRay, checkDestination, createRay, getCameraPlane, getMapCell, updatePosition } from './demo1';
import { getWallMeasurements, renderWall } from './demo3';
import { getFloorMeasurements } from './demo5';
import { renderFloorAndCeiling } from './demo6';
import { applyMapTextures, attachInputs, map, mapSize, renderDoor, updateAnimations } from './demo8';
import { Vec2, attachRenderFunction, initCanvas, loadTextureData } from './util';


export async function initDemo9() {
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

    const textures: Partial<Record<string, ImageData>> = Object.fromEntries(await Promise.all(Object.entries({
        W: loadTextureData('/assets/content/misc/textures/wall.png'),
        F: loadTextureData('/assets/content/misc/textures/floor.png'),
        C: loadTextureData('/assets/content/misc/textures/ceiling.png'),
        D: loadTextureData('/assets/content/misc/textures/door.png'),
        d: loadTextureData('/assets/content/misc/textures/door-side.png'),
        b: loadTextureData('/assets/content/misc/textures/barrel.png'),
    }).map(async ([k, p]) => [k, await p])));
    applyMapTextures(map, textures);

    const animations: ((dt: number) => boolean)[] = [];

    const [canvas, ctx] = initCanvas('canvas9');
    const aspectRatio = canvas.width / canvas.height;
    const repaint = attachRenderFunction(canvas, dt => {
        updatePosition(dt, playerInputs, playerPos, playerDir, checkDest);
        updateAnimations(animations, dt);
        renderEnv(canvas, ctx, aspectRatio, playerPos, playerDir)
    });
    attachInputs(canvas, aspectRatio, playerInputs, repaint, playerPos, playerDir, checkDest, animations);
}

export function renderEnv(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    aspectRatio: number,
    playerPos: Vec2,
    playerDir: Vec2,
) {
    const cameraPlane = getCameraPlane(playerDir);
    for (let x = 0; x < canvas.width; x++) {
        const ray = createRay(canvas, aspectRatio, playerPos, playerDir, x, cameraPlane);
        const stripe = ctx.getImageData(x, 0, 1, canvas.height);

        let yFloor = 0;
        let yFloorMax = canvas.height;
        let yCeiling = 0;
        let yCeilingMax = yFloorMax;

        let floorCell = getMapCell(map, ray.mapPos, mapSize)
        while (true) {
            advanceRay(ray);
            const cell = getMapCell(map, ray.mapPos, mapSize)
            if (!cell) {
                break;
            }
            const wall = getWallMeasurements(ray, canvas.height, playerPos);
            const floor = getFloorMeasurements(ray, wall);
            [yFloor, yCeiling] = renderFloorAndCeiling(canvas, stripe, wall, floor, playerPos, ray.perpWallDist,
                yFloor, yCeiling, yFloorMax, yCeilingMax, floorCell?.floorTexture, floorCell?.ceilingTexture);

            if (cell.door) {
                if (renderDoor(canvas, stripe, cell, cell.door, ray, playerPos, floor, yFloor, yCeiling, yFloorMax, yCeilingMax)) {
                    break;
                }
            } else if (cell.solid) {
                renderWall(canvas, stripe, ray, wall, cell.wallTexture);
                break;
            }
            floorCell = cell;
        }
        ctx.putImageData(stripe, x, 0);
    }
}


