import { PlayerInputs, Ray, advanceRay, attachKeyboard, attachMouse, attachTouch, createRay, getCameraPlane, getMapCell, updatePosition } from './demo1';
import { getBrightness } from './demo2';
import { textureSize } from './demo3';
import { FloorMeasurements, getFloorMeasurements } from './demo5';
import { attachUseKey } from './demo8';
import { Vec2, Vec3, attachRenderFunction, initCanvas, loadTextureData } from './util';

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
    'Z889ABCDEFGHIJKLMNOZ',
    'Z888888888888888888Z',
    'Z888888888888888888Z',
    'Z888888888888888888Z',
    'Z888888888888888888Z',
    'Z888888888888888888Z',
    'ZZZZZZZZZZZZZZZZZZZZ',
];

const ceilingHeights = [
    'ZZZZZZZZZZZZZZZZZZZZ',
    'ZOOOOOOOOOOOOOOOOOOZ',
    'ZOOOOOOOOOOOOOOOOOOZ',
    'ZOOOOOOOOOOOOOOOOOOZ',
    'ZOOOOOOOOOOOOOOOOOOZ',
    'ZOOOOOOOOOOOOOOOOOOZ',
    'ZOOOOOOOOOOOOOOOOOOZ',
    'ZOOOOOOOOOOOOOOOOOOZ',
    'ZOOOOOOOOOOOOOOOOOOZ',
    'ZOOOOOOOOOOOOOOOOOOZ',
    'ZZZZZZZZZZZZZZZZZZZZ',
];

const maxStepSize = 1/8;
const playerHeight = 5/8;
const gravity = 9.82;

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
            floorHeight: parseInt(floorHeightRow[x], 36) / 8,
            ceilingHeight: parseInt(ceilingHeightRow[x], 36) / 8,
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
    const playerVel: Vec3 = {x: 0, y: 0, z: 0};
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
        applyGravity(playerPos, playerVel, map, dt);
        const cameraPlane = getCameraPlane(playerDir);
        renderEnv(canvas, ctx, aspectRatio, playerPos, playerDir, cameraPlane)
    });
    attachInputs(canvas, aspectRatio, playerInputs, repaint, playerPos, playerDir, playerVel, setPos, animations);
}

export function applyMapTextures(map: Cell[][], textures: Partial<Record<string, ImageData>>) {
    map.forEach(row => row.forEach(cell => {
        cell.wallTexture = textures[cell.wallType];
        cell.floorTexture = textures[cell.floorType];
        cell.ceilingTexture = textures[cell.ceilingType];
    }));
}

export function attachInputs(
    canvas: HTMLCanvasElement,
    aspectRatio: number,
    playerInputs: PlayerInputs,
    repaint: () => void,
    playerPos: Vec3,
    playerDir: Vec2,
    playerVel: Vec3,
    setPos: (dest: Vec2) => void,
    animations: ((dt: number) => boolean)[],
) {
    attachKeyboard(canvas, playerInputs);
    attachMouse(canvas, repaint, playerPos, playerDir, setPos);
    attachTouch(canvas, repaint, playerPos, playerDir, setPos);
    attachUseKey(canvas, aspectRatio, playerPos, playerDir, animations);
    attachJumpKey(canvas, playerPos, playerVel);
}

export function attachJumpKey(
    canvas: HTMLCanvasElement,
    playerPos: Vec3,
    playerVel: Vec3,
) {
    canvas.addEventListener('keypress', e => {
        if (e.key === ' ') {
            const cell = map[playerPos.y | 0][playerPos.x | 0];
            if (cell && playerPos.z === cell.floorHeight) {
                playerVel.z = 3;
            }
        }
    });
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
    if (cell.floorHeight <= playerPos.z + maxStepSize && cell.ceilingHeight > Math.max(playerPos.z, cell.floorHeight) + playerHeight) {
        playerPos.x = newPlayerPos.x;
        playerPos.y = newPlayerPos.y;
        if (playerPos.z < cell.floorHeight) {
            playerPos.z = cell.floorHeight;
        }
    }
}

export function applyGravity(
    playerPos: Vec3,
    playerVel: Vec3,
    map: Cell[][],
    dt: number,
) {
    const cell = map[playerPos.y | 0][playerPos.x | 0];
    if (cell && (playerVel.z !== 0 || playerPos.z > cell.floorHeight)) {
        playerPos.z += playerVel.z * dt;
        playerVel.z -= gravity * dt;
        if (playerPos.z <= cell.floorHeight) {
            playerPos.z = cell.floorHeight;
            playerVel.z = 0;
        } else if (playerPos.z > cell.ceilingHeight - playerHeight) {
            playerPos.z = cell.ceilingHeight - playerHeight;
            playerVel.z = 0;
        }
    }
}

export function renderEnv(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    aspectRatio: number,
    playerPos: Vec3,
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
            if (!ray.perpWallDist) {
                continue;
            }
            const wall = getWallMeasurements(ray, cell, canvas.height, playerPos);
            const floor = getFloorMeasurements(ray, wall);
            if (floorCell) {
                [yFloor, yCeiling] = renderFloorAndCeiling(canvas, stripe, floorCell, wall, floor, playerPos, ray.perpWallDist,
                    yFloor, yCeiling, yFloorMax, yCeilingMax, floorCell.floorTexture, floorCell.ceilingTexture);
            }
            ctx.putImageData(stripe, x, 0);

            [yFloor, yCeiling, yFloorMax, yCeilingMax] = renderWall(canvas, stripe, ray, cell, wall, yFloor, yCeiling, yFloorMax, yCeilingMax, cell.wallTexture);
            ctx.putImageData(stripe, x, 0);
            floorCell = cell;
        }
        zBuffer[x] = ray.perpWallDist;
    }
    return zBuffer;
}

export interface WallMeasurements {
    heightMultiplier: number;
    wallHeight: number;
    wallX: number;
    wallY: number;
}

export function getWallMeasurements(ray: Ray, cell: Cell, canvasHeight: number, playerPos: Vec3): WallMeasurements {
    const heightMultiplier = canvasHeight / ray.perpWallDist;
    const wallHeight = Math.ceil(heightMultiplier * cell.cellHeight);
    const wallY = Math.floor(canvasHeight / 2 + playerPos.z * heightMultiplier + (0.5 - cell.cellHeight) * heightMultiplier);
    let wallX: number;
    if (ray.side === 0) {
        wallX = playerPos.y + ray.perpWallDist * ray.rayDir.y - ray.mapPos.y;
    } else {
        wallX = playerPos.x + ray.perpWallDist * ray.rayDir.x - ray.mapPos.x;
    }
    return {heightMultiplier, wallHeight, wallX, wallY};
}

export function renderWall(
    canvas: HTMLCanvasElement,
    stripe: ImageData,
    ray: Ray,
    cell: Cell,
    wall: WallMeasurements,
    yFloor: number,
    yCeiling: number,
    yFloorMax: number,
    yCeilingMax: number,
    wallTexture?: ImageData,
): [number, number, number, number] {
    if (cell.cellHeight <= 0) {
        return [yFloor, yCeiling, yFloorMax, yCeilingMax];
    }
    const ceilingY = Math.ceil(wall.wallY + (cell.cellHeight - cell.ceilingHeight) * wall.heightMultiplier);
    const floorY = Math.ceil(wall.wallY + (cell.cellHeight - cell.floorHeight) * wall.heightMultiplier);

    const brightness = getBrightness(ray.perpWallDist, ray.side);

    let texX: number = wall.wallX * textureSize.x | 0;
    const yStart = Math.max(wall.wallY, yCeiling);
    const yEnd = Math.min(wall.wallY + wall.wallHeight + 1, canvas.height - yFloor);

    const step = textureSize.y * ray.perpWallDist / canvas.height;
    let texPos = wall.wallY < yStart ? (yStart - wall.wallY) * step : 0;
    texPos += (1 - cell.cellHeight + (cell.cellHeight | 0)) * textureSize.y;

    for (let y = yStart; y < yEnd; y++) {
        const offset = y * 4;
        const texY = texPos & (textureSize.y - 1);
        texPos += step;
        if (y > ceilingY && y < floorY) {
            continue;
        }
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
    return [
        Math.max(yFloor, canvas.height - floorY),
        Math.max(yCeiling, ceilingY),
        Math.min(yFloorMax, canvas.height - ceilingY),
        Math.min(yCeilingMax, floorY),
    ];
}

export function renderFloorAndCeiling(
    canvas: HTMLCanvasElement,
    stripe: ImageData,
    cell: Cell,
    wall: WallMeasurements,
    floor: FloorMeasurements,
    playerPos: Vec3,
    floorDist: number,
    yFloor: number,
    yCeiling: number,
    yFloorMax: number,
    yCeilingMax: number,
    floorTexture?: ImageData,
    ceilingTexture?: ImageData,
): [number, number]{
    const cellY = (canvas.height - wall.heightMultiplier) * 0.5;
    const floorCellY = Math.ceil(cellY - playerPos.z * wall.heightMultiplier + cell.floorHeight * wall.heightMultiplier);
    const ceilingCellY = Math.ceil(cellY + playerPos.z * wall.heightMultiplier - (cell.ceilingHeight - 1) * wall.heightMultiplier);
    yFloor = renderFloor(canvas, stripe, cell, floor, floorCellY, playerPos, yFloor, yFloorMax, floorDist, floorTexture);
    yCeiling = renderCeiling(canvas, stripe, cell, floor, playerPos, ceilingCellY, yCeiling, yCeilingMax, floorDist, ceilingTexture)
    return [yFloor, yCeiling];
}

export function renderFloor(
    canvas: HTMLCanvasElement,
    stripe: ImageData,
    cell: Cell,
    floor: FloorMeasurements,
    floorCellY: number,
    playerPos: Vec3,
    yFloor: number,
    yFloorMax: number,
    perpWallDist: number,
    floorTexture?: ImageData,
): number {
    if (!floorTexture) {
        return Math.max(yFloor, Math.min(floorCellY, yFloorMax));
    }
    const zMultiplier = 2 * playerPos.z - 2 * cell.floorHeight + 1;
    while (yFloor < floorCellY && yFloor < yFloorMax) {
        const y = (canvas.height - yFloor - 1);
        mapFloorTexture(canvas, stripe, y, zMultiplier, floor, playerPos, yFloor, perpWallDist, floorTexture);
        yFloor++;
    }
    return yFloor;
}

export function renderCeiling(
    canvas: HTMLCanvasElement,
    stripe: ImageData,
    cell: Cell,
    floor: FloorMeasurements,
    playerPos: Vec3,
    ceilingCellY: number,
    yCeiling: number,
    yCeilingMax: number,
    perpWallDist: number,
    ceilingTexture?: ImageData,
): number {
    if (!ceilingTexture) {
        return Math.max(yCeiling, Math.min(ceilingCellY, yCeilingMax));
    }
    const zMultiplier = -2 * playerPos.z + 2 * cell.ceilingHeight - 1;
    while (yCeiling < ceilingCellY && yCeiling < yCeilingMax) {
        mapFloorTexture(canvas, stripe, yCeiling, zMultiplier, floor, playerPos, yCeiling, perpWallDist, ceilingTexture);
        yCeiling++;
    }
    return yCeiling;
}

export function mapFloorTexture(
    canvas: HTMLCanvasElement,
    stripe: ImageData,
    y: number,
    zMultiplier: number,
    floor: FloorMeasurements,
    playerPos: Vec3,
    yFloor: number,
    perpWallDist: number,
    floorTexture: ImageData,
) {
    const rowDistance = canvas.height * zMultiplier / (canvas.height - 2 * yFloor);
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
