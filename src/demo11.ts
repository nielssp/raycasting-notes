import { PlayerInputs, Ray, advanceRay, attachKeyboard, attachMouse, attachTouch, createRay, getCameraPlane, getMapCell, updatePosition } from './demo1';
import { getBrightness } from './demo2';
import { textureSize } from './demo3';
import { FloorMeasurements, getFloorMeasurements } from './demo5';
import { doorEnd, doorStart, updateAnimations } from './demo8';
import { Vec2, Vec3, attachRenderFunction, initCanvas, loadTextureData, sub2 } from './util';

export interface Door {
    doorTexture?: ImageData;
    sideTexture?: ImageData;
    offset: number;
    active: boolean;
    open: boolean;
}

export interface Cell {
    door?: Door;
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

export interface Sprite {
    pos: Vec3;
    texture: ImageData;
    relPos: Vec2;
    relDist: number;
}

const walls = [
    'WWWWWWWWWWW',
    'WWWWWWWWWWW',
    'WWWWWWWWWWW',
    'WWWWWWWWWWW',
    'WWWWWWWWWWW',
    'WWWWWCWWWWW',
    'WWWWWWWWWWW',
    'WWWWWWWWWWW',
    'WWWWWWWWWWW',
    'WWWWWWWWWWW',
    'WWWWWWWWWWW',
];

const floors = [
    'WWWWWWWWWWW',
    'WFFFFFFFFFW',
    'WFFFFFFFFFW',
    'WFFFFFFFFFW',
    'WFFFFFFFFFW',
    'WFFFFCFFFFW',
    'WFFFFFFFFFW',
    'WFFFFFFFFFW',
    'WFFFFFFFFFW',
    'WFFFFFFFFFW',
    'WFFFFFFFFFW',
];

const ceilings = [
    '           ',
    '           ',
    '           ',
    '           ',
    '           ',
    '           ',
    'CCWCCCCWCCC',
    'CCCCCCCCCCC',
    'CCCCCCCCCCC',
    'CCCCCCCCCCC',
    'CCCCCCCCCCC',
];

const floorHeights = [
    'JJJJJJJJJJJ',
    'J888888888J',
    'J889ABCD88J',
    'J888888E88J',
    'J888888F88J',
    'J8888C8G88J',
    'ZZ8ZZZZGZZZ',
    'Z88888GGJJZ',
    'Z88888GGJJZ',
    'Z88888GGJJZ',
    'ZZZZZZZZZZZ',
];

const ceilingHeights = [
    'ZZZZZZZZZZZ',
    'ZZZZZZZZZZZ',
    'ZZZZZZZZZZZ',
    'ZZZZZZZZZZZ',
    'ZZZZZZZZZZZ',
    'ZZZZZZZZZZZ',
    'ZSGSSSSOSSZ',
    'ZUUUUUUUUUZ',
    'ZUUUUUUUUUZ',
    'ZUUUUUUUUUZ',
    'ZZZZZZZZZZZ',
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

    map[6][2].door = {
        doorTexture: textures['D'],
        sideTexture: textures['d'],
        offset: 0,
        active: false,
        open: false,
    };

    const animations: ((dt: number) => boolean)[] = [];

    const sprites: Sprite[] = [];
    const barrelTexture = await loadTextureData('/assets/content/misc/textures/barrel.png');
    sprites.push(createSprite({x: 3, y: 4, z: 1}, barrelTexture));
    sprites.push(createSprite({x: 4, y: 3.75, z: 1}, barrelTexture));
    sprites.push(createSprite({x: 7.5, y: 9.5, z: 2}, barrelTexture));

    const [canvas, ctx] = initCanvas('canvas11');
    const aspectRatio = canvas.width / canvas.height;
    const repaint = attachRenderFunction(canvas, dt => {
        updatePosition(dt, playerInputs, playerPos, playerDir, setPos);
        updateAnimations(animations, dt);
        applyGravity(playerPos, playerVel, map, dt);
        const cameraPlane = getCameraPlane(playerDir);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        const zBuffer = renderEnv(canvas, ctx, aspectRatio, playerPos, playerDir, cameraPlane)
        renderSprites(canvas, ctx, aspectRatio, sprites, zBuffer, playerPos, playerDir, cameraPlane);
    });
    attachInputs(canvas, aspectRatio, playerInputs, repaint, playerPos, playerDir, playerVel, setPos, map, mapSize, animations);
}

export function createSprite(pos: Vec3, texture: ImageData): Sprite {
    return {
        pos,
        texture,
        relPos: {
            x: 0,
            y: 0,
        },
        relDist: 0,
    };
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
    map: Cell[][],
    mapSize: Vec2,
    animations: ((dt: number) => boolean)[],
) {
    attachKeyboard(canvas, playerInputs);
    attachMouse(canvas, repaint, playerPos, playerDir, setPos);
    attachTouch(canvas, repaint, playerPos, playerDir, setPos);
    attachUseKey(canvas, aspectRatio, playerPos, playerDir, map, mapSize, animations);
    attachJumpKey(canvas, playerPos, playerVel);
}

export function attachUseKey(
    canvas: HTMLCanvasElement,
    aspectRatio: number,
    playerPos: Vec3,
    playerDir: Vec2,
    map: Cell[][],
    mapSize: Vec2,
    animations: ((dt: number) => boolean)[],
) {
    canvas.addEventListener('keypress', e => {
        if (e.key === 'e') {
            e.preventDefault();
            const wall = castRayToWall(canvas, aspectRatio, playerPos, playerDir, Math.floor(canvas.width / 2), map, mapSize);
            if (wall?.cell.door && wall.dist < 1.5) {
                openDoor(wall.pos, wall.cell.door, playerPos, animations);
            }
        }
    });
    canvas.addEventListener('click', e => {
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / rect.width * canvas.width);
        const y = Math.floor((e.clientY - rect.top) / rect.height * canvas.height);
        if (x >= 0 && x < canvas.width) {
            const wall = castRayToPoint(canvas, aspectRatio, playerPos, playerDir, x, y, map, mapSize);
            if (wall?.cell.door && wall.dist < 1.5) {
                openDoor(wall.pos, wall.cell.door, playerPos, animations);
            }
        }
    });
    canvas.addEventListener('touchend', e => {
        if (e.changedTouches.length) {
            const touch = e.changedTouches[0];
            const rect = canvas.getBoundingClientRect();
            const x = Math.floor((touch.clientX - rect.left) / rect.width * canvas.width);
            const y = Math.floor((touch.clientY - rect.top) / rect.height * canvas.height);
            if (x >= 0 && x < canvas.width) {
                const wall = castRayToPoint(canvas, aspectRatio, playerPos, playerDir, x, y, map, mapSize);
                if (wall?.cell.door && wall.dist < 1.5) {
                    openDoor(wall.pos, wall.cell.door, playerPos, animations);
                }
            }
        }
    });
}

export function openDoor(
    mapPos: Vec2,
    door: Door,
    playerPos: Vec2,
    animations: ((dt: number) => boolean)[],
) {
    if (door.active) {
        return;
    }
    door.active = true;
    animations.push(dt => {
        door.offset += dt;
        if (door.offset >= 0.984375) {
            door.offset = 0.984375;
            door.active = false;
            door.open = true;
            setTimeout(() => closeDoor(mapPos, door, playerPos, animations), 3000);
            return false;
        }
        return true;
    });
}

export function closeDoor(
    mapPos: Vec2,
    door: Door,
    playerPos: Vec2,
    animations: ((dt: number) => boolean)[],
) {
    if (door.active) {
        return;
    }
    if (Math.floor(playerPos.x) === mapPos.x && Math.floor(playerPos.y) === mapPos.y) {
        setTimeout(() => closeDoor(mapPos, door, playerPos, animations), 1000);
        return;
    }
    door.active = true;
    door.open = false;
    animations.push(dt => {
        door.offset -= dt;
        if (door.offset <= 0) {
            door.offset = 0;
            door.active = false;
            return false;
        }
        return true;
    });
}

export function castRayToPoint(
    canvas: HTMLCanvasElement,
    aspectRatio: number,
    playerPos: Vec3,
    playerDir: Vec2,
    x: number,
    _y: number,
    map: Cell[][],
    mapSize: Vec2,
): {
    pos: Vec2;
    cell: Cell;
    dist: number;
} | undefined {
    const cell = castRayToWall(canvas, aspectRatio, playerPos, playerDir, x, map, mapSize);
    if (cell) {
        return cell;
    }
    return undefined;
}

export function castRayToWall(
    canvas: HTMLCanvasElement,
    aspectRatio: number,
    playerPos: Vec3,
    playerDir: Vec2,
    x: number,
    map: Cell[][],
    mapSize: Vec2,
): {
    pos: Vec2;
    cell: Cell;
    dist: number;
} | undefined {
    const cameraPlane = getCameraPlane(playerDir);
    const ray = createRay(canvas, aspectRatio, playerPos, playerDir, x, cameraPlane);
    while (true) {
        advanceRay(ray);
        const cell = getMapCell(map, ray.mapPos, mapSize)
        if (!cell) {
            return undefined;
        }
        if (cell.floorHeight >= playerPos.z + playerHeight || cell.ceilingHeight <= playerPos.z + playerHeight || cell.door && !cell.door.open) {
            return {
                pos: ray.mapPos,
                cell,
                dist: ray.perpWallDist,
            }
        }
    }
}


export function attachJumpKey(
    canvas: HTMLCanvasElement,
    playerPos: Vec3,
    playerVel: Vec3,
) {
    canvas.addEventListener('keypress', e => {
        if (e.key === ' ') {
            e.preventDefault();
            const cell = map[playerPos.y | 0][playerPos.x | 0];
            if (cell && playerPos.z === cell.floorHeight) {
                playerVel.z = 3;
            }
        }
    });
    canvas.addEventListener('contextmenu', e => {
        e.preventDefault();
        const cell = map[playerPos.y | 0][playerPos.x | 0];
        if (cell && playerPos.z === cell.floorHeight) {
            playerVel.z = 3;
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
        return;
    }
    const cell = map[mapPos.y][mapPos.x];
    if (cell.door && !cell.door.open) {
        return;
    }
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
    const zBuffer = Array(canvas.width * canvas.height);
    for (let x = 0; x < canvas.width; x++) {
        const zBufferOffset = x * canvas.height;
        const ray = createRay(canvas, aspectRatio, playerPos, playerDir, x, cameraPlane);
        const stripe = ctx.getImageData(x, 0, 1, canvas.height);

        let yFloor = 0;
        let yCeiling = 0;
        let yFloorMax = canvas.height;
        let yCeilingMax = yFloorMax;

        let floorCell = getMapCell(map, ray.mapPos, mapSize)
        while (true) {
            advanceRay(ray);
            if (canvas.height - yFloor < yCeiling) {
                break;
            }
            if (!ray.perpWallDist) {
                continue;
            }
            const wall = getWallMeasurements(ray, canvas.height, playerPos);
            const floor = getFloorMeasurements(ray, wall.wallX);
            if (floorCell) {
                [yFloor, yCeiling] = renderFloorAndCeiling(canvas, stripe, floorCell, wall, floor, playerPos, ray.perpWallDist,
                    yFloor, yCeiling, yFloorMax, yCeilingMax, zBuffer, zBufferOffset, floorCell.floorTexture, floorCell.ceilingTexture);
            }

            const cell = getMapCell(map, ray.mapPos, mapSize)
            if (!cell) {
                break;
            }

            [yFloor, yCeiling, yFloorMax, yCeilingMax] = renderWall(canvas, stripe, ray, cell, wall, yFloor, yCeiling, yFloorMax, yCeilingMax, playerPos, zBuffer, zBufferOffset, cell.wallTexture);
            if (cell.door) {
                if (renderDoor(canvas, stripe, cell, cell.door, ray, playerPos, floor, yFloor, yCeiling, yFloorMax, yCeilingMax, zBuffer, zBufferOffset)) {
                    break;
                }
            }
            floorCell = cell;
        }
        ctx.putImageData(stripe, x, 0);
        zBuffer[x] = ray.perpWallDist;
    }
    return zBuffer;
}

export interface WallMeasurements {
    heightMultiplier: number;
    wallX: number;
}

export function getWallMeasurements(ray: Ray, canvasHeight: number, playerPos: Vec3): WallMeasurements {
    const heightMultiplier = canvasHeight / ray.perpWallDist;
    let wallX: number;
    if (ray.side === 0) {
        wallX = playerPos.y + ray.perpWallDist * ray.rayDir.y - ray.mapPos.y;
    } else {
        wallX = playerPos.x + ray.perpWallDist * ray.rayDir.x - ray.mapPos.x;
    }
    return {heightMultiplier, wallX};
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
    playerPos: Vec3,
    zBuffer: number[],
    zBufferOffset: number,
    wallTexture?: ImageData,
): [number, number, number, number] {
    if (cell.cellHeight <= 0) {
        return [yFloor, yCeiling, yFloorMax, yCeilingMax];
    }
    const wallHeight = Math.ceil(wall.heightMultiplier * cell.cellHeight);
    const wallY = Math.floor(canvas.height / 2 + playerPos.z * wall.heightMultiplier + (0.5 - cell.cellHeight) * wall.heightMultiplier);
    const ceilingY = Math.ceil(wallY + (cell.cellHeight - cell.ceilingHeight) * wall.heightMultiplier);
    const floorY = Math.ceil(wallY + (cell.cellHeight - cell.floorHeight) * wall.heightMultiplier);

    const brightness = getBrightness(ray.perpWallDist, ray.side);

    let texX: number = wall.wallX * textureSize.x | 0;
    const yStart = Math.max(wallY, yCeiling);
    const yEnd = Math.min(wallY + wallHeight + 1, canvas.height - yFloor);

    const step = textureSize.y * ray.perpWallDist / canvas.height;
    let texPos = wallY < yStart ? (yStart - wallY) * step : 0;
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
        zBuffer[zBufferOffset + y] = ray.perpWallDist;
    }
    return [
        Math.max(yFloor, canvas.height - floorY),
        Math.max(yCeiling, ceilingY),
        Math.min(yFloorMax, canvas.height - ceilingY),
        Math.min(yCeilingMax, floorY),
    ];
}

export function renderDoor(
    canvas: HTMLCanvasElement,
    stripe: ImageData,
    cell: Cell,
    door: Door,
    ray: Ray,
    playerPos: Vec3,
    floor: FloorMeasurements,
    yFloor: number,
    yCeiling: number,
    yFloorMax: number,
    yCeilingMax: number,
    zBuffer: number[],
    zBufferOffset: number,
): boolean {
    const floorDist = ray.perpWallDist;
    let doorX: number;
    if (ray.side === 0) {
        doorX = playerPos.y + (ray.sideDist.x - ray.deltaDist.x * doorEnd) * ray.rayDir.y;
    } else {
        doorX = playerPos.x + (ray.sideDist.y - ray.deltaDist.y * doorEnd) * ray.rayDir.x;
    }
    let doorMapX = Math.floor(doorX);
    let doorSide = false;
    if (doorX - doorMapX < door.offset) {
        // The door is partially open and we're looking through the opening
        doorSide = true;
        if (ray.side === 0) {
            doorX = playerPos.x + (ray.sideDist.y - ray.deltaDist.y * (1 - door.offset)) * ray.rayDir.x;
        } else {
            doorX = playerPos.y + (ray.sideDist.x - ray.deltaDist.x * (1 - door.offset)) * ray.rayDir.y;
        }
        let doorMapX = Math.floor(doorX);
        if (doorX - doorMapX < doorStart || doorX - doorMapX > doorEnd) {
            return false;
        } else if (ray.side === 1 && doorMapX === ray.mapPos.y && ray.rayDir.x > 0) {
            ray.side = 0;
            ray.perpWallDist = ray.sideDist.x - ray.deltaDist.x * (1 - door.offset);
            ray.sideDist.x += ray.deltaDist.x * door.offset;
        } else if (ray.side === 0 && doorMapX === ray.mapPos.x && ray.rayDir.y > 0) {
            ray.side = 1;
            ray.perpWallDist = ray.sideDist.y - ray.deltaDist.y * (1 - door.offset);
            ray.sideDist.y += ray.deltaDist.y * door.offset;
        } else {
            return false;
        }
    } else if (ray.side === 0 && doorMapX === ray.mapPos.y) {
        ray.perpWallDist = ray.sideDist.x - ray.deltaDist.x * doorEnd;
        ray.sideDist.x += ray.deltaDist.x * doorStart;
    } else if (ray.side === 1 && doorMapX === ray.mapPos.x) {
        ray.perpWallDist = ray.sideDist.y - ray.deltaDist.y * doorEnd;
        ray.sideDist.y += ray.deltaDist.y * doorStart;
    } else {
        return false;
    }
    const wall = getWallMeasurements(ray, canvas.height, playerPos);
    if (!doorSide) {
        wall.wallX -= door.offset;
    }
    [yFloor, yCeiling] = renderFloorAndCeiling(canvas, stripe, cell, wall, floor, playerPos, floorDist, yFloor, yCeiling, yFloorMax, yCeilingMax, zBuffer, zBufferOffset, cell.floorTexture, cell.ceilingTexture);
    const doorTexture = doorSide ? door.sideTexture : door.doorTexture;
    const brightness = getBrightness(ray.perpWallDist, ray.side);

    let texX: number = wall.wallX * textureSize.x | 0;
    const wallHeight = Math.ceil(wall.heightMultiplier * cell.cellHeight);
    const wallY = Math.floor(canvas.height / 2 + playerPos.z * wall.heightMultiplier + (0.5 - cell.cellHeight) * wall.heightMultiplier);
    const yStart = Math.max(wallY, yCeiling);
    const yEnd = Math.min(wallY + wallHeight + 1, canvas.height - yFloor);

    const step = textureSize.y * ray.perpWallDist / canvas.height;
    let texPos = wallY < yStart ? (yStart - wallY) * step : 0;

    for (let y = yStart; y < yEnd; y++) {
        const offset = y * 4;
        const texY = texPos & (textureSize.y - 1);
        texPos += step;
        if (doorTexture) {
            const texOffset = (texY * textureSize.x + texX) * 4;
            stripe.data[offset] = doorTexture.data[texOffset] * brightness;
            stripe.data[offset + 1] = doorTexture.data[texOffset + 1] * brightness;
            stripe.data[offset + 2] = doorTexture.data[texOffset + 2] * brightness;
            stripe.data[offset + 3] = 255;
        } else {
            stripe.data[offset] = 0;
            stripe.data[offset + 1] = 85 * brightness;
            stripe.data[offset + 2] = 102 * brightness;
            stripe.data[offset + 3] = 255;
        }
        zBuffer[zBufferOffset + y] = ray.perpWallDist;
    }
    return true;
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
    zBuffer: number[],
    zBufferOffset: number,
    floorTexture?: ImageData,
    ceilingTexture?: ImageData,
): [number, number]{
    const cellY = (canvas.height - wall.heightMultiplier) * 0.5;
    const floorCellY = Math.ceil(cellY - playerPos.z * wall.heightMultiplier + cell.floorHeight * wall.heightMultiplier);
    const ceilingCellY = Math.ceil(cellY + playerPos.z * wall.heightMultiplier - (cell.ceilingHeight - 1) * wall.heightMultiplier);
    yFloor = renderFloor(canvas, stripe, cell, floor, floorCellY, playerPos, yFloor, yFloorMax, floorDist,
        zBuffer, zBufferOffset, floorTexture);
    yCeiling = renderCeiling(canvas, stripe, cell, floor, playerPos, ceilingCellY, yCeiling, yCeilingMax, floorDist,
        zBuffer, zBufferOffset, ceilingTexture)
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
    zBuffer: number[],
    zBufferOffset: number,
    floorTexture?: ImageData,
): number {
    if (!floorTexture) {
        return Math.max(yFloor, Math.min(floorCellY, yFloorMax));
    }
    const zMultiplier = 2 * playerPos.z - 2 * cell.floorHeight + 1;
    while (yFloor < floorCellY && yFloor < yFloorMax) {
        const y = (canvas.height - yFloor - 1);
        mapFloorTexture(canvas, stripe, y, zMultiplier, floor, playerPos, yFloor, perpWallDist, floorTexture);
        zBuffer[zBufferOffset + y] = perpWallDist;
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
    zBuffer: number[],
    zBufferOffset: number,
    ceilingTexture?: ImageData,
): number {
    if (!ceilingTexture) {
        return Math.max(yCeiling, Math.min(ceilingCellY, yCeilingMax));
    }
    const zMultiplier = -2 * playerPos.z + 2 * cell.ceilingHeight - 1;
    while (yCeiling < ceilingCellY && yCeiling < yCeilingMax) {
        mapFloorTexture(canvas, stripe, yCeiling, zMultiplier, floor, playerPos, yCeiling, perpWallDist, ceilingTexture);
        zBuffer[zBufferOffset + yCeiling] = perpWallDist;
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

export function renderSprites(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    aspectRatio: number,
    sprites: Sprite[],
    zBuffer: number[],
    playerPos: Vec3,
    playerDir: Vec2,
    cameraPlane: Vec2,
) {
    for (const sprite of sprites) {
        sprite.relPos = sub2(sprite.pos, playerPos);
        sprite.relDist = sprite.relPos.x * sprite.relPos.x + sprite.relPos.y * sprite.relPos.y;
    }
    sprites.sort((a, b) => b.relDist - a.relDist);

    const invDet = 1 / (cameraPlane.x * playerDir.y - playerDir.x * cameraPlane.y);
    for (const sprite of sprites) {
        const transformX = invDet * (playerDir.y * sprite.relPos.x - playerDir.x * sprite.relPos.y);
        const transformY = invDet * (-cameraPlane.y * sprite.relPos.x + cameraPlane.x * sprite.relPos.y);
        const spriteScreenX = canvas.width / aspectRatio * (aspectRatio / 2 + transformX / transformY) | 0;
        const spriteHeight = Math.abs(canvas.height / transformY | 0);
        const drawStartY = (-spriteHeight / 2 + canvas.height / 2 - (sprite.pos.z - playerPos.z) * spriteHeight) | 0;
        const spriteWidth = Math.abs(canvas.height / transformY | 0);
        const drawStartX = Math.max(0, -spriteWidth / 2 + spriteScreenX) | 0;
        const drawEndX = Math.min(canvas.width - 1, spriteWidth / 2 + spriteScreenX) | 0;
        const texY = 0;
        const xMax = drawEndX - drawStartX;
        if (xMax < 1 || transformY <= 0) {
            continue;
        }
        const screenStartY = Math.max(0, drawStartY);
        const spriteYOffset = drawStartY < 0 ? drawStartY : 0;
        const yMax = Math.min(canvas.height, screenStartY + spriteHeight) - screenStartY;
        const brightness = getBrightness(transformY);
        const imageData = ctx.getImageData(drawStartX, screenStartY, xMax, yMax);
        for (let x = 0; x < xMax; x++) {
            const stripe = x + drawStartX;
            const texX = Math.floor(64 * (stripe - (-spriteWidth / 2 + spriteScreenX)) * textureSize.x / spriteWidth / 64);

            if (stripe > 0 && stripe < canvas.width) {
                for (let y = 0; y < yMax; y++) {
                    const zOffset = ((x + drawStartX) * canvas.height + y + screenStartY);
                    if (transformY >= zBuffer[zOffset]) {
                        continue;
                    }
                    const texYPos = texY + Math.floor((y - spriteYOffset) / spriteHeight * textureSize.y);
                    const offset = (y * imageData.width + x) * 4;
                    const texOffset = (texYPos * textureSize.x + texX) * 4;
                    if (sprite.texture.data[texOffset + 3]) {
                        imageData.data[offset] = sprite.texture.data[texOffset] * brightness;
                        imageData.data[offset + 1] = sprite.texture.data[texOffset + 1] * brightness;
                        imageData.data[offset + 2] = sprite.texture.data[texOffset + 2] * brightness;
                        imageData.data[offset + 3] = sprite.texture.data[texOffset + 3];
                    }
                }
            }
        }
        ctx.putImageData(imageData, drawStartX, screenStartY);
    }
}
