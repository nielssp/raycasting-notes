import { PlayerInputs, advanceRay, createRay, getCameraPlane, getMapCell, setPlayerPos, updatePosition } from './demo1';
import { createSky, getBrightness, renderBackground } from './demo2';
import { getWallMeasurements, renderWall, textureSize } from './demo3';
import { getFloorMeasurements } from './demo5';
import { renderFloorAndCeiling } from './demo6';
import { applyMapTextures, attachInputs, map, mapSize, renderDoor, updateAnimations } from './demo8';
import { Vec2, attachRenderFunction, initCanvas, loadTextureData, sub2 } from './util';

export interface Sprite {
    pos: Vec2;
    texture: ImageData;
    relPos: Vec2;
    relDist: number;
}

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

    const [canvas, ctx] = initCanvas('canvas9');
    const sky = createSky(canvas, ctx);
    const aspectRatio = canvas.width / canvas.height;
    const repaint = attachRenderFunction(canvas, dt => {
        updatePosition(dt, playerInputs, playerPos, playerDir, setPos);
        updateAnimations(animations, dt);
        renderBackground(canvas, ctx, sky);
        const cameraPlane = getCameraPlane(playerDir);
        const zBuffer = renderEnv(canvas, ctx, aspectRatio, playerPos, playerDir, cameraPlane)
        sortSprites(sprites, playerPos);
        renderSprites(canvas, ctx, aspectRatio, sprites, zBuffer, cameraPlane);
    });
    attachInputs(canvas, aspectRatio, playerInputs, repaint, playerPos, playerDir, setPos, map, mapSize, animations);
}

export function createSprite(pos: Vec2, texture: ImageData): Sprite {
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
        zBuffer[x] = ray.perpWallDist;
    }
    return zBuffer;
}

export function sortSprites(
    sprites: Sprite[],
    playerPos: Vec2,
) {
    for (const sprite of sprites) {
        sprite.relPos = sub2(sprite.pos, playerPos);
        sprite.relDist = sprite.relPos.x * sprite.relPos.x + sprite.relPos.y * sprite.relPos.y;
    }
    sprites.sort((a, b) => b.relDist - a.relDist);
}

export function renderSprites(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    aspectRatio: number,
    sprites: Sprite[],
    zBuffer: number[],
    cameraPlane: Vec2,
) {
    for (const sprite of sprites) {
        const transform: Vec2 = {
            x: cameraPlane.x * sprite.relPos.x + cameraPlane.y * sprite.relPos.y,
            y: cameraPlane.y * sprite.relPos.x - cameraPlane.x * sprite.relPos.y,
        };
        if (transform.y <= 0) {
            continue;
        }
        const spriteWidth = Math.floor(canvas.height / transform.y);
        const spriteScreenX = Math.floor(canvas.width * (0.5 + transform.x / (aspectRatio * transform.y)));
        const drawStartX = Math.max(0, Math.floor(spriteScreenX - spriteWidth / 2));
        const drawEndX = Math.min(canvas.width, Math.floor(spriteScreenX + spriteWidth / 2 ));
        const xMax = drawEndX - drawStartX;
        if (xMax < 1) {
            continue;
        }
        const spriteHeight = spriteWidth;
        const spriteScreenY = Math.floor(canvas.height / 2 - spriteHeight / 2);
        const drawStartY = Math.max(0, spriteScreenY);
        const drawEndY = Math.min(canvas.height, spriteScreenY + spriteHeight);
        const yMax = drawEndY - drawStartY;
        const brightness = getBrightness(transform.y);
        const imageData = ctx.getImageData(drawStartX, drawStartY, xMax, yMax);
        for (let x = 0; x < xMax; x++) {
            const stripeX = x + drawStartX;
            const texX = Math.floor((stripeX + spriteWidth / 2 - spriteScreenX) / spriteWidth * textureSize.x);

            if (transform.y >= zBuffer[stripeX]) {
                continue;
            }
            for (let y = 0; y < yMax; y++) {
                const texYPos = Math.floor((y + drawStartY - spriteScreenY) / spriteHeight * textureSize.y);
                const texOffset = (texYPos * textureSize.x + texX) * 4;
                if (sprite.texture.data[texOffset + 3]) {
                    const offset = (y * imageData.width + x) * 4;
                    imageData.data[offset] = sprite.texture.data[texOffset] * brightness;
                    imageData.data[offset + 1] = sprite.texture.data[texOffset + 1] * brightness;
                    imageData.data[offset + 2] = sprite.texture.data[texOffset + 2] * brightness;
                    imageData.data[offset + 3] = sprite.texture.data[texOffset + 3];
                }
            }
        }
        ctx.putImageData(imageData, drawStartX, drawStartY);
    }
}
