import { PlayerInputs, Ray, advanceRay, attachKeyboard, attachMouse, attachTouch, createRay, getCameraPlane, getMapCell, getWallHeight, setPlayerPos, updatePosition } from './demo1';
import { createSky, renderBackground } from './demo2';
import { getWallMeasurements, renderWall } from './demo3';
import { FloorMeasurements, getFloorMeasurements } from './demo5';
import { renderFloorAndCeiling } from './demo6';
import { Vec2, attachRenderFunction, initCanvas, loadTextureData } from './util';

export interface Door {
    sideTexture?: ImageData;
    offset: number;
    active: boolean,
}

export interface Cell {
    solid: boolean;
    door?: Door;
    wallType: string;
    floorType: string;
    ceilingType: string;
    wallTexture?: ImageData;
    floorTexture?: ImageData;
    ceilingTexture?: ImageData;
}

export const map: Cell[][] = [
    'WWWWWWWWWWWWWWWWWWWW',
    'W        W         W',
    'W        D         W',
    'W      W W   W     W',
    'W     WW W   W     W',
    'W        W   W     W',
    'W     WDWWWWWW     W',
    'W                  W',
    'W                  W',
    'W                  W',
    'WWWWWWWWWWWWWWWWWWWW',
].map(row => row.split('').map(wallType => {
    return {
        solid: wallType !== ' ',
        door: wallType === 'D' ? {
            offset: 0,
            active: false,
        } : undefined,
        wallType,
        floorType: 'F',
        ceilingType: 'C',
    };
}));
export const mapSize: Vec2 = {
    x: map[0].length,
    y: map.length,
};

export const doorDepth = 1 / 8;
export const doorStart = 0.5 - doorDepth / 2;
export const doorEnd = doorStart + doorDepth

export async function initDemo8() {
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

    const textures: Partial<Record<string, ImageData>> = Object.fromEntries(await Promise.all(Object.entries({
        W: loadTextureData('wall.png'),
        F: loadTextureData('floor.png'),
        C: loadTextureData('ceiling.png'),
        D: loadTextureData('door.png'),
        d: loadTextureData('door-side.png'),
    }).map(async ([k, p]) => [k, await p])));
    applyMapTextures(map, textures);

    const animations: ((dt: number) => boolean)[] = [];

    const [canvas, ctx] = initCanvas('canvas8');
    const sky = createSky(canvas, ctx);
    const aspectRatio = canvas.width / canvas.height;
    const repaint = attachRenderFunction(canvas, dt => {
        updatePosition(dt, playerInputs, playerPos, playerDir, setPos);
        updateAnimations(animations, dt);
        renderBackground(canvas, ctx, sky);
        renderEnv(canvas, ctx, aspectRatio, playerPos, playerDir)
    });
    attachInputs(canvas, aspectRatio, playerInputs, repaint, playerPos, playerDir, setPos, map, mapSize, animations);
}

export function applyMapTextures(map: Cell[][], textures: Partial<Record<string, ImageData>>) {
    map.forEach(row => row.forEach(cell => {
        if (cell.door) {
            cell.door.sideTexture = textures[cell.wallType.toLowerCase()];
        }
        cell.wallTexture = textures[cell.wallType];
        cell.floorTexture = textures[cell.floorType];
        cell.ceilingTexture = textures[cell.ceilingType];
    }));
}

export function updateAnimations(animations: ((dt: number) => boolean)[], dt: number) {
  for (let i = animations.length - 1; i >= 0; i--) {
    if (!animations[i](dt)) {
      animations.splice(i, 1);
    }
  }
}

export function attachInputs(
    canvas: HTMLCanvasElement,
    aspectRatio: number,
    playerInputs: PlayerInputs,
    repaint: () => void,
    playerPos: Vec2,
    playerDir: Vec2,
    setPos: (dest: Vec2) => void,
    map: Cell[][],
    mapSize: Vec2,
    animations: ((dt: number) => boolean)[],
) {
    attachKeyboard(canvas, playerInputs);
    attachMouse(canvas, repaint, playerPos, playerDir, setPos);
    attachTouch(canvas, repaint, playerPos, playerDir, setPos);
    attachUseKey(canvas, aspectRatio, playerPos, playerDir, map, mapSize, animations);
}

export function attachUseKey(
    canvas: HTMLCanvasElement,
    aspectRatio: number,
    playerPos: Vec2,
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
                openDoor(wall.pos, wall.cell, wall.cell.door, playerPos, animations);
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
                openDoor(wall.pos, wall.cell, wall.cell.door, playerPos, animations);
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
                    openDoor(wall.pos, wall.cell, wall.cell.door, playerPos, animations);
                }
            }
        }
    });
}

export function openDoor(
    mapPos: Vec2,
    cell: Cell,
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
        if (door.offset >= 62/64) {
            door.offset = 62/64;
            door.active = false;
            cell.solid = false;
            setTimeout(() => closeDoor(mapPos, cell, door, playerPos, animations), 3000);
            return false;
        }
        return true;
    });
}

export function closeDoor(
    mapPos: Vec2,
    cell: Cell,
    door: Door,
    playerPos: Vec2,
    animations: ((dt: number) => boolean)[],
) {
    if (door.active) {
        return;
    }
    if (Math.floor(playerPos.x) === mapPos.x && Math.floor(playerPos.y) === mapPos.y) {
        setTimeout(() => closeDoor(mapPos, cell, door, playerPos, animations), 1000);
        return;
    }
    door.active = true;
    cell.solid = true;
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
    playerPos: Vec2,
    playerDir: Vec2,
    x: number,
    y: number,
    map: Cell[][],
    mapSize: Vec2,
): {
    pos: Vec2;
    cell: Cell;
    dist: number;
} | undefined {
    const cell = castRayToWall(canvas, aspectRatio, playerPos, playerDir, x, map, mapSize);
    if (cell) {
        const {wallHeight, wallY} = getWallHeight(canvas.height, cell.dist);
        if (y >= wallY && y < wallY + wallHeight) {
            return cell;
        }
    }
    return undefined;
}

export function castRayToWall(
    canvas: HTMLCanvasElement,
    aspectRatio: number,
    playerPos: Vec2,
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
        // TODO: door
        if (cell.solid) {
            return {
                pos: ray.mapPos,
                cell,
                dist: ray.perpWallDist,
            }
        }
    }
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

        let floorCell = getMapCell(map, ray.mapPos, mapSize)
        while (true) {
            advanceRay(ray);
            const cell = getMapCell(map, ray.mapPos, mapSize)
            if (!cell) {
                break;
            }
            const wall = getWallMeasurements(ray, canvas.height, playerPos);
            const floor = getFloorMeasurements(ray, wall.wallX);
            [yFloor, yCeiling] = renderFloorAndCeiling(canvas, stripe, wall, floor, playerPos, ray.perpWallDist,
                yFloor, yCeiling, floorCell?.floorTexture, floorCell?.ceilingTexture);

            if (cell.door) {
                if (renderDoor(canvas, stripe, cell, cell.door, ray, playerPos, floor, yFloor, yCeiling)) {
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

export function renderDoor(
    canvas: HTMLCanvasElement,
    stripe: ImageData,
    cell: Cell,
    door: Door,
    ray: Ray,
    playerPos: Vec2,
    floor: FloorMeasurements,
    yFloor: number,
    yCeiling: number,
): boolean {
    const floorWallDist = ray.perpWallDist;
    let doorX: number;
    if (ray.side === 0) {
        doorX = playerPos.y + (ray.perpWallDist + ray.deltaDist.x * doorStart) * ray.rayDir.y - ray.mapPos.y;
    } else {
        doorX = playerPos.x + (ray.perpWallDist + ray.deltaDist.y * doorStart) * ray.rayDir.x - ray.mapPos.x;
    }
    if (doorX < 0 || doorX >= 1) {
        return false;
    }
    let doorSide = false;
    if (doorX < door.offset) {
        // The door is partially open and we're looking through the opening
        doorSide = true;
        let doorX: number;
        if (ray.side === 0) {
            if (ray.rayDir.y < 0) {
                return false;
            }
            doorX = playerPos.x + (ray.sideDist.y - ray.deltaDist.y * (1 - door.offset)) * ray.rayDir.x - ray.mapPos.x;
        } else {
            if (ray.rayDir.x < 0) {
                return false;
            }
            doorX = playerPos.y + (ray.sideDist.x - ray.deltaDist.x * (1 - door.offset)) * ray.rayDir.y - ray.mapPos.y;
        }
        if (doorX < doorStart || doorX > doorEnd) {
            return false;
        } else if (ray.side === 0) {
            ray.side = 1;
            ray.perpWallDist = ray.sideDist.y - ray.deltaDist.y * (1 - door.offset);
        } else {
            ray.side = 0;
            ray.perpWallDist = ray.sideDist.x - ray.deltaDist.x * (1 - door.offset);
        }
    } else if (ray.side === 0) {
        ray.perpWallDist = ray.sideDist.x - ray.deltaDist.x * doorEnd;
    } else {
        ray.perpWallDist = ray.sideDist.y - ray.deltaDist.y * doorEnd;
    }
    const wall = getWallMeasurements(ray, canvas.height, playerPos);
    if (!doorSide) {
        wall.wallX -= door.offset;
    }
    renderFloorAndCeiling(canvas, stripe, wall, floor, playerPos, floorWallDist,
        yFloor, yCeiling, cell.floorTexture, cell.ceilingTexture);
    renderWall(canvas, stripe, ray, wall, doorSide ? door.sideTexture : cell.wallTexture);
    return true;
}
