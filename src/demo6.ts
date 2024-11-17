import { PlayerInputs, advanceRay, attachKeyboard, attachMouse, attachTouch, createRay, getCameraPlane, getMapCell, map, mapSize, setPlayerPos, updatePosition } from './demo1';
import { createSky, renderBackground } from './demo2';
import { WallMeasurements, getWallMeasurements, renderWall } from './demo3';
import { FloorMeasurements, getFloorMeasurements, mapFloorTexture, renderFloor } from './demo5';
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

    const setPos = (dest: Vec2) => setPlayerPos(playerPos, dest, map, mapSize);

    const wallTexture: ImageData = await loadTextureData('/assets/content/misc/textures/wall.png');
    const floorTexture: ImageData = await loadTextureData('/assets/content/misc/textures/floor.png');
    const ceilingTexture: ImageData = await loadTextureData('/assets/content/misc/textures/ceiling.png');

    const [canvas, ctx] = initCanvas('canvas6');
    const sky = createSky(canvas, ctx);
    const aspectRatio = canvas.width / canvas.height;
    const repaint = attachRenderFunction(canvas, dt => {
        updatePosition(dt, playerInputs, playerPos, playerDir, setPos);
        renderBackground(canvas, ctx, sky);
        renderEnv(canvas, ctx, aspectRatio, playerPos, playerDir, wallTexture, floorTexture, ceilingTexture);
    });
    attachKeyboard(canvas, playerInputs);
    attachMouse(canvas, repaint, playerPos, playerDir, setPos);
    attachTouch(canvas, repaint, playerPos, playerDir, setPos);
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

        while (true) {
            advanceRay(ray);
            const cell = getMapCell(map, ray.mapPos, mapSize)
            if (!cell) {
                break;
            }
            const wall = getWallMeasurements(ray, canvas.height, playerPos);
            const floor = getFloorMeasurements(ray, wall.wallX);
            [yFloor, yCeiling] = renderFloorAndCeiling(canvas, stripe, wall, floor, playerPos, ray.perpWallDist,
                yFloor, yCeiling, floorTexture, ceilingTexture);

            if (cell.solid) {
                renderWall(canvas, stripe, ray, wall, wallTexture);
                break;
            }
        }
        ctx.putImageData(stripe, x, 0);
    }
}

export function renderFloorAndCeiling(
    canvas: HTMLCanvasElement,
    stripe: ImageData,
    wall: WallMeasurements,
    floor: FloorMeasurements,
    playerPos: Vec2,
    floorDist: number,
    yFloor: number,
    yCeiling: number,
    floorTexture?: ImageData,
    ceilingTexture?: ImageData,
): [number, number]{
    const cellY = Math.ceil((canvas.height - wall.wallHeight) * 0.5);
    yFloor = renderFloor(canvas, stripe, floor, cellY, playerPos, yFloor, floorDist, floorTexture);
    yCeiling = renderCeiling(canvas, stripe, floor, playerPos, cellY, yCeiling, floorDist, ceilingTexture)
    return [yFloor, yCeiling];
}

export function renderCeiling(
    canvas: HTMLCanvasElement,
    stripe: ImageData,
    floor: FloorMeasurements,
    playerPos: Vec2,
    cellY: number,
    yCeiling: number,
    perpWallDist: number,
    ceilingTexture?: ImageData,
): number {
    if (!ceilingTexture) {
        return Math.max(yCeiling, cellY);
    }
    while (yCeiling < cellY) {
        mapFloorTexture(canvas, stripe, yCeiling, floor, playerPos, yCeiling, perpWallDist, ceilingTexture);
        yCeiling++;
    }
    return yCeiling;
}


