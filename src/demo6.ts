import { PlayerInputs, advanceRay, attachKeyboard, attachMouse, attachTouch, createRay, getCameraPlane, getMapCell, map, mapSize, setPlayerPos, updatePosition } from './demo1';
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
    const aspectRatio = canvas.width / canvas.height;
    const repaint = attachRenderFunction(canvas, dt => {
        updatePosition(dt, playerInputs, playerPos, playerDir, setPos);
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
        const yFloorMax = canvas.height;
        const yCeilingMax = yFloorMax;

        while (true) {
            advanceRay(ray);
            const cell = getMapCell(map, ray.mapPos, mapSize)
            if (!cell) {
                break;
            }
            const wall = getWallMeasurements(ray, canvas.height, playerPos);
            const floor = getFloorMeasurements(ray, wall.wallX);
            [yFloor, yCeiling] = renderFloorAndCeiling(canvas, stripe, wall, floor, playerPos, ray.perpWallDist,
                yFloor, yCeiling, yFloorMax, yCeilingMax, floorTexture, ceilingTexture);

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
    yFloorMax: number,
    yCeilingMax: number,
    floorTexture?: ImageData,
    ceilingTexture?: ImageData,
): [number, number]{
    const cellY = (canvas.height - wall.wallHeight) * 0.5;
    const floorCellY = Math.ceil(cellY);
    const ceilingCellY = Math.ceil(cellY);
    yFloor = renderFloor(canvas, stripe, floor, floorCellY, playerPos, yFloor, yFloorMax, floorDist, floorTexture);
    yCeiling = renderCeiling(canvas, stripe, floor, playerPos, ceilingCellY, yCeiling, yCeilingMax, floorDist, ceilingTexture)
    return [yFloor, yCeiling];
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
        mapFloorTexture(canvas, stripe, yCeiling, floor, playerPos, yCeiling, perpWallDist, ceilingTexture);
        yCeiling++;
    }
    return yCeiling;
}


