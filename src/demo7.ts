import { PlayerInputs, advanceRay, attachKeyboard, attachMouse, attachTouch, checkDestination, createRay, getCameraPlane, getMapCell, updatePosition } from './demo1';
import { getWallMeasurements, renderWall } from './demo3';
import { getFloorMeasurements } from './demo5';
import { renderFloorAndCeiling } from './demo6';
import { Vec2, attachRenderFunction, initCanvas, loadTextureData } from './util';

export interface Cell {
    solid: boolean;
    wallType: string;
    floorType: string;
    ceilingType: string;
    wallTexture?: ImageData;
    floorTexture?: ImageData;
    ceilingTexture?: ImageData;
}

const walls = [
    'WWWWWRWWWRRRRRWWWWWW',
    'W        R         W',
    'W        R         W',
    'W      W R   R     W',
    'W     WW R   R     W',
    'W        R   R     W',
    'W     RRRRRRRR     W',
    'W                  W',
    'W                  W',
    'W                  W',
    'WWWWWWWWWWWWWWWWWWWW',
];

const floors = [
    'FFFFFFFFFFFFFFFFFFFF',
    'FFFFFFFFFFFFFFFFFFFF',
    'FFFFFFFFFFFFFFFFFFFF',
    'FFFFGGGGGGGGGFFFFFFF',
    'FFFFGGGGGGGGGFFFFFFF',
    'FFFFGGGGGGGGGFFFFFFF',
    'FFFFFFFFFFFFFFFFFFFF',
    'FFFFFFFFFFFFFFFFFFFF',
    'FFFFFFFFFFFFFFFFFFFF',
    'FFFFFFFFFFFFFFFFFFFF',
    'FFFFFFFFFFFFFFFFFFFF',
];

const ceilings = [
    'CCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCFFFCCCCCCCCCC',
    'CCCCCCCFFFCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCC',
];

export const map: Cell[][] = walls.map((row, y) => {
    const floorTypes = floors[y].split('');
    const ceilingTypes = ceilings[y].split('');
    return row.split('').map((wallType, x) => {
        return {
            solid: wallType !== ' ',
            wallType,
            floorType: floorTypes[x],
            ceilingType: ceilingTypes[x],
        };
    })
});
export const mapSize: Vec2 = {
    x: map[0].length,
    y: map.length,
};

export async function initDemo7() {
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
        R: loadTextureData('/assets/content/misc/textures/wall-red.png'),
        F: loadTextureData('/assets/content/misc/textures/floor.png'),
        G: loadTextureData('/assets/content/misc/textures/floor-green.png'),
        C: loadTextureData('/assets/content/misc/textures/ceiling.png'),
    }).map(async ([k, p]) => [k, await p])));
    applyMapTextures(map, textures);

    const [canvas, ctx] = initCanvas('canvas7');
    const aspectRatio = canvas.width / canvas.height;
    const repaint = attachRenderFunction(canvas, dt => {
        updatePosition(dt, playerInputs, playerPos, playerDir, checkDest);
        renderEnv(canvas, ctx, aspectRatio, playerPos, playerDir);
    });
    attachKeyboard(canvas, playerInputs);
    attachMouse(canvas, repaint, playerPos, playerDir, checkDest);
    attachTouch(canvas, repaint, playerPos, playerDir, checkDest);
}

export function applyMapTextures(map: Cell[][], textures: Partial<Record<string, ImageData>>) {
    map.forEach(row => row.forEach(cell => {
        cell.wallTexture = textures[cell.wallType];
        cell.floorTexture = textures[cell.floorType];
        cell.ceilingTexture = textures[cell.ceilingType];
    }));
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
        let yCeiling = 0;
        const yFloorMax = canvas.height;
        const yCeilingMax = yFloorMax;

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

            if (cell.solid) {
                renderWall(canvas, stripe, ray, wall, cell.wallTexture);
                break;
            }
            floorCell = cell;
        }
        ctx.putImageData(stripe, x, 0);
    }
}


