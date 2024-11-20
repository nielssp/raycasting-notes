import { PlayerInputs, advanceRay, checkDestination, createRay, getCameraPlane, getMapCell, updatePosition } from './demo1';
import { createSky, renderBackground } from './demo2';
import { getWallMeasurements, renderWall } from './demo3';
import { getFloorMeasurements } from './demo5';
import { renderFloorAndCeiling } from './demo6';
import { Door, applyMapTextures, attachInputs, renderDoor, updateAnimations } from './demo8';
import { Sprite, createSprite, renderSprites } from './demo9';
import { Vec2, add2, attachRenderFunction, initCanvas, loadTextureData, set2, sub2 } from './util';

export interface Cell {
    solid: boolean;
    door?: Door;
    wallType: string;
    floorType: string;
    ceilingType: string;
    wallTexture?: ImageData;
    floorTexture?: ImageData;
    ceilingTexture?: ImageData;
    portal?: Vec2;
}

export const map: Cell[][] = [
    'WWWWWWWWWWWWWWWWWWWW',
    'W      WWWWWWWW    W',
    'W      WWWWWWWW    W',
    'W     WWWWWWWWWWW  W',
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
map[1][6].portal = {x: 16, y: 1};
map[2][6].portal = {x: 16, y: 2};
map[1][15].portal = {x: 5, y: 1};
map[2][15].portal = {x: 5, y: 2};
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

    const sprites: Sprite[] = [];
    const barrelTexture = await loadTextureData('/assets/content/misc/textures/barrel.png');
    sprites.push(createSprite({x: 4, y: 3}, barrelTexture));
    sprites.push(createSprite({x: 5, y: 2.75}, barrelTexture));

    const [canvas, ctx] = initCanvas('canvas10');
    const sky = createSky(canvas, ctx);
    const aspectRatio = canvas.width / canvas.height;
    const repaint = attachRenderFunction(canvas, dt => {
        updatePosition(dt, playerInputs, playerPos, playerDir, setPos);
        updateAnimations(animations, dt);
        renderBackground(canvas, ctx, sky);
        const cameraPlane = getCameraPlane(playerDir);
        const zBuffer = renderEnv(canvas, ctx, aspectRatio, playerPos, playerDir, cameraPlane)
        renderSprites(canvas, ctx, aspectRatio, sprites, zBuffer, playerPos, cameraPlane);
    });
    attachInputs(canvas, aspectRatio, playerInputs, repaint, playerPos, playerDir, setPos, map, mapSize, animations);
}

export function setPlayerPos(
    playerPos: Vec2,
    newPlayerPos: Vec2,
    map: Cell[][],
    mapSize: Vec2,
) {
    if (checkDestination(newPlayerPos, map, mapSize)) {
        const currentMapPos = {x: Math.floor(playerPos.x), y: Math.floor(playerPos.y)};
        const newMapPos = {x: Math.floor(newPlayerPos.x), y: Math.floor(newPlayerPos.y)};
        if (currentMapPos.x !== newMapPos.x || currentMapPos.y !== newMapPos.y) {
            const cell = getMapCell(map, newMapPos, mapSize);
            if (cell?.portal) {
                set2(playerPos, add2(newPlayerPos, sub2(cell.portal, newMapPos)));
                return;
            }
        }
        set2(playerPos, newPlayerPos);
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

        let offsetPlayerPos = playerPos;

        let yFloor = 0;
        let yCeiling = 0;

        let floorCell = getMapCell(map, ray.mapPos, mapSize)
        while (true) {
            advanceRay(ray);
            let cell = getMapCell(map, ray.mapPos, mapSize)
            if (!cell) {
                break;
            }
            const wall = getWallMeasurements(ray, canvas.height, offsetPlayerPos);
            const floor = getFloorMeasurements(ray, wall.wallX);
            [yFloor, yCeiling] = renderFloorAndCeiling(canvas, stripe, wall, floor, offsetPlayerPos, ray.perpWallDist,
                yFloor, yCeiling, floorCell?.floorTexture, floorCell?.ceilingTexture);

            if (cell.portal) {
                offsetPlayerPos = add2(offsetPlayerPos, sub2(cell.portal, ray.mapPos));
                ray.mapPos = {...cell.portal};
                cell = getMapCell(map, ray.mapPos, mapSize)
            } else if (cell.door) {
                if (renderDoor(canvas, stripe, cell, cell.door, ray, offsetPlayerPos, floor, yFloor, yCeiling)) {
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
