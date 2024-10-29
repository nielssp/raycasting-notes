import { PlayerInputs, advanceRay, checkDestination, createRay, getCameraPlane, getMapCell, updatePosition } from './demo1';
import { getWallMeasurements, renderWall } from './demo3';
import { getFloorMeasurements } from './demo5';
import { renderFloorAndCeiling } from './demo6';
import { Door, applyMapTextures, attachInputs, renderDoor, updateAnimations } from './demo8';
import { Sprite, createSprite, renderSprites } from './demo9';
import { Vec2, add2, attachRenderFunction, initCanvas, loadTextureData, sub2 } from './util';

export interface Cell {
    solid: boolean;
    door?: Door;
    wallType: string;
    floorType: string;
    ceilingType: string;
    wallTexture?: ImageData;
    floorTexture?: ImageData;
    ceilingTexture?: ImageData;
    portal?: Vec2,
}

export const map: Cell[][] = [
    'WWWWWWWWWWWWWWWWWWWW',
    'W      WWWW        W',
    'W       WW         W',
    'W      WWWWWWW     W',
    'W     WWWWWWWW     W',
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
map[2][7].portal = {x: 10, y: 2};
map[2][10].portal = {x: 7, y: 2};
export const mapSize: Vec2 = {
    x: map[0].length,
    y: map.length,
};

export async function initDemo10() {
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
    }).map(async ([k, p]) => [k, await p])));
    applyMapTextures(map, textures);

    const animations: ((dt: number) => boolean)[] = [];

    const sprites: Sprite[] = [];
    const barrelTexture = await loadTextureData('/assets/content/misc/textures/barrel.png');
    sprites.push(createSprite({x: 4, y: 3}, barrelTexture));
    sprites.push(createSprite({x: 5, y: 2.75}, barrelTexture));

    const [canvas, ctx] = initCanvas('canvas10');
    const aspectRatio = canvas.width / canvas.height;
    const repaint = attachRenderFunction(canvas, dt => {
        updatePosition(dt, playerInputs, playerPos, playerDir, checkDest);
        updateAnimations(animations, dt);
        const cameraPlane = getCameraPlane(playerDir);
        const zBuffer = renderEnv(canvas, ctx, aspectRatio, playerPos, playerDir, cameraPlane)
        renderSprites(canvas, ctx, aspectRatio, sprites, zBuffer, playerPos, playerDir, cameraPlane);
    });
    attachInputs(canvas, aspectRatio, playerInputs, repaint, playerPos, playerDir, checkDest, animations);
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

        let offsetPlayerPos = playerPos;

        let yFloor = 0;
        let yCeiling = 0;
        const yFloorMax = canvas.height;
        const yCeilingMax = yFloorMax;

        let floorCell = getMapCell(map, ray.mapPos, mapSize)
        while (true) {
            advanceRay(ray);
            let cell = getMapCell(map, ray.mapPos, mapSize)
            if (!cell) {
                break;
            }
            const wall = getWallMeasurements(ray, canvas.height, offsetPlayerPos);
            const floor = getFloorMeasurements(ray, wall);
            [yFloor, yCeiling] = renderFloorAndCeiling(canvas, stripe, wall, floor, offsetPlayerPos, ray.perpWallDist,
                yFloor, yCeiling, yFloorMax, yCeilingMax, floorCell?.floorTexture, floorCell?.ceilingTexture);

            if (cell.portal) {
                offsetPlayerPos = add2(offsetPlayerPos, sub2(cell.portal, ray.mapPos));
                ray.mapPos = {...cell.portal};
                cell = getMapCell(map, ray.mapPos, mapSize)
            } else if (cell.door) {
                if (renderDoor(canvas, stripe, cell, cell.door, ray, offsetPlayerPos, floor, yFloor, yCeiling, yFloorMax, yCeilingMax)) {
                    break;
                }
            } else if (cell.solid) {
                renderWall(canvas, stripe, ray, wall, cell.wallTexture);
                break;
            }
            floorCell = cell;
        }
        ctx.putImageData(stripe, x, 0);
        zBuffer[x] = ray.perpWallDist;
    }
    return zBuffer;
}
