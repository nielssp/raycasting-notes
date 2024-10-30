import { PlayerInputs, Ray, advanceRay, checkDestination, createRay, getCameraPlane, getMapCell, updatePosition } from './demo1';
import { getBrightness } from './demo2';
import { WallMeasurements, getWallMeasurements, renderWall, textureSize } from './demo3';
import { getFloorMeasurements } from './demo5';
import { renderFloorAndCeiling } from './demo6';
import { Door, attachInputs, renderDoor, updateAnimations } from './demo8';
import { Sprite, createSprite, renderSprites } from './demo9';
import { Vec2, Vec3, add2, attachRenderFunction, initCanvas, loadTextureData, set2, sub2 } from './util';

export interface Cell {
    wallType: string;
    floorType: string;
    ceilingType: string;
    wallTexture?: ImageData;
    floorTexture?: ImageData;
    ceilingTexture?: ImageData;
    cellHeight: number;
    floorHeight: number;
    ceilingHeight: number;
}

const walls = [
    'WWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWW',
];

const floors = [
    'FFFFFFFFFFFFFFFFFFFF',
    'FFFFFFFFFFFFFFFFFFFF',
    'FFFFFFFFFFFFFFFFFFFF',
    'FFFFFFFFFFFFFFFFFFFF',
    'FFFFFFFFFFFFFFFFFFFF',
    'FFFFFFFFFFFFFFFFFFFF',
    'FFFFFFFFFFFFFFFFFFFF',
    'FFFFFFFFFFFFFFFFFFFF',
    'FFFFFFFFFFFFFFFFFFFF',
    'FFFFFFFFFFFFFFFFFFFF',
    'FFFFFFFFFFFFFFFFFFFF',
];

const ceilings = [
    'CCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCC',
];

const floorHeights = [
    'ZZZZZZZZZZZZZZZZZZZZ',
    'Z888888888888888888Z',
    'Z888888888888888888Z',
    'Z888888888888888888Z',
    'Z888888888888888888Z',
    'Z888888888888888888Z',
    'Z888888888888888888Z',
    'Z888888888888888888Z',
    'Z888888888888888888Z',
    'Z888888888888888888Z',
    'ZZZZZZZZZZZZZZZZZZZZ',
];

const ceilingHeights = [
    'ZZZZZZZZZZZZZZZZZZZZ',
    'ZGGGGGGGGGGGGGGGGGGZ',
    'ZGGGGGGGGGGGGGGGGGGZ',
    'ZGGGGGGGGGGGGGGGGGGZ',
    'ZGGGGGGGGGGGGGGGGGGZ',
    'ZGGGGGGGGGGGGGGGGGGZ',
    'ZGGGGGGGGGGGGGGGGGGZ',
    'ZGGGGGGGGGGGGGGGGGGZ',
    'ZGGGGGGGGGGGGGGGGGGZ',
    'ZGGGGGGGGGGGGGGGGGGZ',
    'ZZZZZZZZZZZZZZZZZZZZ',
];

const maxStepSize = 1/8;

const playerHeight = 5/8;

export const map: Cell[][] = walls.map((row, y) => {
    const floorTypes = floors[y].split('');
    const ceilingTypes = ceilings[y].split('');
    const floorHeightRow = floorHeights[y].split('');
    const ceilingHeightRow = ceilingHeights[y].split('');
    return row.split('').map((wallType, x) => {
        return {
            wallType,
            floorType: floorTypes[x],
            ceilingType: ceilingTypes[x],
            cellHeight: 4,
            floorHeight: parseInt(floorHeightRow[x], 36),
            ceilingHeight: parseInt(ceilingHeightRow[x], 36),
        };
    })
});
export const mapSize: Vec2 = {
    x: map[0].length,
    y: map.length,
};

export async function initDemo11() {
    const playerPos: Vec3 = {x: 2, y: 3, z: 1};
    const playerDir: Vec2 = {x: 1, y: 0};
    const playerInputs: PlayerInputs = {
        moveForward: false,
        moveBackward: false,
        turnLeft: false,
        turnRight: false,
        rotationSpeed: 0,
    };

    const setPos = (dest: Vec2) => setPlayerPos(playerPos, dest, map, mapSize);

    const textures: Partial<Record<string, ImageData>> = Object.fromEntries(await Promise.all(Object.entries({
        W: loadTextureData('/assets/content/misc/textures/wall.png'),
        F: loadTextureData('/assets/content/misc/textures/floor.png'),
        C: loadTextureData('/assets/content/misc/textures/ceiling.png'),
        D: loadTextureData('/assets/content/misc/textures/door.png'),
        d: loadTextureData('/assets/content/misc/textures/door-side.png'),
    }).map(async ([k, p]) => [k, await p])));
    applyMapTextures(map, textures);

    const animations: ((dt: number) => boolean)[] = [];

    const [canvas, ctx] = initCanvas('canvas11');
    const aspectRatio = canvas.width / canvas.height;
    const repaint = attachRenderFunction(canvas, dt => {
        updatePosition(dt, playerInputs, playerPos, playerDir, setPos);
        updateAnimations(animations, dt);
        const cameraPlane = getCameraPlane(playerDir);
        renderEnv(canvas, ctx, aspectRatio, playerPos, playerDir, cameraPlane)
    });
    attachInputs(canvas, aspectRatio, playerInputs, repaint, playerPos, playerDir, setPos, animations);
}

export function applyMapTextures(map: Cell[][], textures: Partial<Record<string, ImageData>>) {
    map.forEach(row => row.forEach(cell => {
        cell.wallTexture = textures[cell.wallType];
        cell.floorTexture = textures[cell.floorType];
        cell.ceilingTexture = textures[cell.ceilingType];
    }));
}

export function setPlayerPos(
    playerPos: Vec3,
    newPlayerPos: Vec2,
    map: Cell[][],
    mapSize: Vec2,
) {
    const mapPos = {x: newPlayerPos.x | 0, y: newPlayerPos.y | 0};
    if (mapPos.x < 0 || mapPos.x >= mapSize.x || mapPos.y < 0 || mapPos.y >= mapSize.y) {
        return false;
    }
    const cell = map[mapPos.y][mapPos.x];
    if (cell.floorHeight <= playerPos.z + maxStepSize && cell.ceilingHeight > playerPos.z + playerHeight) {
        playerPos.x = newPlayerPos.x;
        playerPos.y = newPlayerPos.y;
        if (playerPos.z < cell.floorHeight) {
            playerPos.z = cell.floorHeight;
        }
    }
}

export function renderEnv(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    aspectRatio: number,
    playerPos: Vec2,
    playerDir: Vec2,
    cameraPlane: Vec2,
): number[] {
    const zBuffer = Array(canvas.width);
    for (let x = 0; x < canvas.width; x++) {
        const ray = createRay(canvas, aspectRatio, playerPos, playerDir, x, cameraPlane);
        const stripe = ctx.getImageData(x, 0, 1, canvas.height);

        let yFloor = 0;
        let yCeiling = 0;
        let yFloorMax = canvas.height;
        let yCeilingMax = yFloorMax;

        let floorCell = getMapCell(map, ray.mapPos, mapSize)
        while (true) {
            advanceRay(ray);
            const cell = getMapCell(map, ray.mapPos, mapSize)
            if (!cell) {
                break;
            }
            if (canvas.height - yFloor < yCeiling) {
                break;
            }
            const wall = getWallMeasurements(ray, canvas.height, playerPos);
            const floor = getFloorMeasurements(ray, wall);
            [yFloor, yCeiling] = renderFloorAndCeiling(canvas, stripe, wall, floor, playerPos, ray.perpWallDist,
                yFloor, yCeiling, yFloorMax, yCeilingMax, floorCell?.floorTexture, floorCell?.ceilingTexture);

            [yFloor, yCeiling, yFloorMax, yCeilingMax] = renderWall(canvas, stripe, ray, wall, yFloor, yCeiling, yFloorMax, yCeilingMax, cell.wallTexture);
            floorCell = cell;
        }
        ctx.putImageData(stripe, x, 0);
        zBuffer[x] = ray.perpWallDist;
    }
    return zBuffer;
}

export function renderWall(
    canvas: HTMLCanvasElement,
    stripe: ImageData,
    ray: Ray,
    wall: WallMeasurements,
    yFloor: number,
    yCeiling: number,
    yFloorMax: number,
    yCeilingMax: number,
    wallTexture?: ImageData,
): [number, number, number, number] {
    const brightness = getBrightness(ray.perpWallDist, ray.side);

    let texX: number = wall.wallX * textureSize.x | 0;
    /*
    if (ray.side === 0 && ray.rayDir.x < 0) {
        texX = textureSize.x - texX - 1;
    }
    if (ray.side === 1 && ray.rayDir.y > 0) {
        texX = textureSize.x - texX - 1;
    }
    */
    const yStart = Math.max(wall.wallY, 0);
    const yEnd = Math.min(wall.wallY + wall.wallHeight, canvas.height);

    const step = textureSize.y * ray.perpWallDist / canvas.height;
    let texPos = wall.wallY < yStart ? (yStart - wall.wallY) * step : 0;

    for (let y = yStart; y < yEnd; y++) {
        const offset = y * 4;
        const texY = texPos & (textureSize.y - 1);
        texPos += step;
        if (wallTexture) {
            const texOffset = (texY * textureSize.x + texX) * 4;
            stripe.data[offset] = wallTexture.data[texOffset] * brightness;
            stripe.data[offset + 1] = wallTexture.data[texOffset + 1] * brightness;
            stripe.data[offset + 2] = wallTexture.data[texOffset + 2] * brightness;
            stripe.data[offset + 3] = 255;
        } else {
            stripe.data[offset] = 0;
            stripe.data[offset + 1] = 85 * brightness;
            stripe.data[offset + 2] = 102 * brightness;
            stripe.data[offset + 3] = 255;
        }
    }
    return [yFloor, yCeiling, yFloorMax, yCeilingMax];
}

