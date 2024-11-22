import { PlayerInputs, Ray, advanceRay, attachKeyboard, attachMouse, attachTouch, createRay, getCameraPlane, getMapCell, getWallHeight, map, mapSize, setPlayerPos, updatePosition } from './demo1';
import { createSky, getBrightness, renderBackground } from './demo2';
import { Vec2, attachRenderFunction, initCanvas, loadTextureData } from './util';

export const textureSize = {x: 64, y: 64};

export async function initDemo3() {
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

    const [canvas, ctx] = initCanvas('canvas3');
    const aspectRatio = canvas.width / canvas.height;
    const sky = createSky(canvas, ctx);
    const repaint = attachRenderFunction(canvas, dt => {
        updatePosition(dt, playerInputs, playerPos, playerDir, setPos);
        renderBackground(canvas, ctx, sky);
        renderEnv(canvas, ctx, aspectRatio, playerPos, playerDir, wallTexture);
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
) {
    const cameraPlane = getCameraPlane(playerDir);
    for (let x = 0; x < canvas.width; x++) {
        const ray = createRay(canvas, aspectRatio, playerPos, playerDir, x, cameraPlane);
        const stripe = ctx.getImageData(x, 0, 1, canvas.height);
        while (true) {
            advanceRay(ray);
            const cell = getMapCell(map, ray.mapPos, mapSize)
            if (!cell) {
                break;
            } else if (cell.solid) {
                const wall = getWallMeasurements(ray, canvas.height, playerPos);
                renderWall(canvas, stripe, ray, wall, wallTexture);
                break;
            }
        }
        ctx.putImageData(stripe, x, 0);
    }
}

export interface WallMeasurements {
    wallHeight: number;
    wallX: number;
    wallY: number;
}

export function getWallMeasurements(ray: Ray, canvasHeight: number, playerPos: Vec2): WallMeasurements {
    const {wallHeight, wallY} = getWallHeight(canvasHeight, ray.perpWallDist);
    let wallX: number;
    if (ray.side === 0) {
        wallX = playerPos.y + ray.perpWallDist * ray.rayDir.y - ray.mapPos.y;
    } else {
        wallX = playerPos.x + ray.perpWallDist * ray.rayDir.x - ray.mapPos.x;
    }
    return {wallHeight, wallX, wallY};
}

export function renderWall(
    canvas: HTMLCanvasElement,
    stripe: ImageData,
    ray: Ray,
    wall: WallMeasurements,
    wallTexture?: ImageData,
) {
    const brightness = getBrightness(ray.perpWallDist, ray.side);

    const texX = (wall.wallX * textureSize.x) & (textureSize.x - 1);
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

    const step = textureSize.y / wall.wallHeight;
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
}

