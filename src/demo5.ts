import { PlayerInputs, attachKeyboard, attachMouse, attachTouch, map, mapSize, updatePosition } from './demo1';
import { createSky, renderBackground } from './demo2';
import { loadTextureData, textureSize } from './demo3';
import { Vec2, add2, attachRenderFunction, initCanvas, mul2 } from './util';

export async function initDemo5() {
    const playerPos: Vec2 = {x: 2, y: 3};
    const playerDir: Vec2 = {x: 1, y: 0};
    const playerInputs: PlayerInputs = {
        moveForward: false,
        moveBackward: false,
        turnLeft: false,
        turnRight: false,
        rotationSpeed: 0,
    };

    const wallTexture: ImageData = await loadTextureData('/assets/content/misc/textures/wall2.png');
    const floorTexture: ImageData = await loadTextureData('/assets/content/misc/textures/floor.png');

    const [canvas, ctx] = initCanvas('canvas5');
    const aspectRatio = canvas.width / canvas.height;
    const sky = createSky(canvas, ctx);
    const repaint = attachRenderFunction(canvas, dt => {
        updatePosition(dt, playerInputs, playerPos, playerDir);
        renderBackground(canvas, ctx, sky);
        renderEnv(canvas, ctx, aspectRatio, playerPos, playerDir, wallTexture, floorTexture);
    });
    attachKeyboard(canvas, playerInputs);
    attachMouse(canvas, repaint, playerPos, playerDir);
    attachTouch(canvas, repaint, playerPos, playerDir);
}

export function renderEnv(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    aspectRatio: number,
    playerPos: Vec2,
    playerDir: Vec2,
    wallTexture: ImageData,
    floorTexture: ImageData,
) {
    const sideDist = {x: 0, y: 0};
    let perpWallDist = 0;
    let step = {x: 0, y: 0};
    const cameraPlane = {
        x: -playerDir.y,
        y: playerDir.x,
    };
    for (let x = 0; x < canvas.width; x++) {
        const cameraX = aspectRatio * x / canvas.width - aspectRatio / 2;
        const rayDir = add2(playerDir, mul2(cameraX, cameraPlane));
        const mapPos = {x: playerPos.x | 0, y: playerPos.y | 0};
        const deltaDist = {
            x: Math.abs(1 / rayDir.x),
            y: Math.abs(1 / rayDir.y),
        };
        if (rayDir.x < 0) {
            step.x = -1;
            sideDist.x = (playerPos.x - mapPos.x) * deltaDist.x;
        } else {
            step.x = 1;
            sideDist.x = (mapPos.x + 1.0 - playerPos.x) * deltaDist.x;
        }
        if (rayDir.y < 0) {
            step.y = -1;
            sideDist.y = (playerPos.y - mapPos.y) * deltaDist.y;
        } else {
            step.y = 1;
            sideDist.y = (mapPos.y + 1.0 - playerPos.y) * deltaDist.y;
        }

        let yFloor = 0;
        let yFloorMax = canvas.height;

        const stripe = ctx.getImageData(x, 0, 1, canvas.height);
        while (true) {
            let side = 0;
            if (sideDist.x < sideDist.y) {
                perpWallDist = sideDist.x;
                sideDist.x += deltaDist.x;
                mapPos.x += step.x;
            } else {
                perpWallDist = sideDist.y;
                sideDist.y += deltaDist.y;
                mapPos.y += step.y;
                side = 1;
            }
            if (mapPos.x < 0 || mapPos.x >= mapSize.x || mapPos.y < 0 || mapPos.y >= mapSize.y) {
                break;
            }
            const cell = map[mapPos.y][mapPos.x];

            const wallHeight = Math.ceil(canvas.height / perpWallDist);
            const wallY = Math.floor((canvas.height - wallHeight) / 2);
            const cellY = (canvas.height - wallHeight) * 0.5;
            const floorCellY = Math.ceil(cellY);
            let wallX: number;
            if (side === 0) {
                wallX = playerPos.y + perpWallDist * rayDir.y;
            } else {
                wallX = playerPos.x + perpWallDist * rayDir.x;
            }
            wallX -= wallX | 0;
            let floorXWall: number, floorYWall: number;
            if (side === 0 && rayDir.x > 0) {
                floorXWall = mapPos.x;
                floorYWall = mapPos.y + wallX;
            } else if (side === 0 && rayDir.x < 0) {
                floorXWall = mapPos.x + 1;
                floorYWall = mapPos.y + wallX;
            } else if (side === 1 && rayDir.y > 0) {
                floorXWall = mapPos.x + wallX;
                floorYWall = mapPos.y;
            } else {
                floorXWall = mapPos.x + wallX;
                floorYWall = mapPos.y + 1;
            }
            yFloor = renderFloor(canvas, stripe, playerPos, floorXWall, floorYWall, yFloor, yFloorMax, floorCellY, perpWallDist, floorTexture);

            if (cell.solid) {
                renderWall(canvas, stripe, wallHeight, wallX, wallY, perpWallDist, side, rayDir, wallTexture);
                break;
            }
        }
        ctx.putImageData(stripe, x, 0);
    }
}

export function renderFloor(
    canvas: HTMLCanvasElement,
    stripe: ImageData,
    playerPos: Vec2,
    floorXWall: number,
    floorYWall: number,
    yFloor: number,
    yFloorMax: number,
    floorCellY: number,
    perpWallDist: number,
    floorTexture: ImageData,
): number {
    while (yFloor < floorCellY && yFloor < yFloorMax) {
        const rowDistance = canvas.height / (canvas.height - 2 * yFloor);
        const weight = rowDistance / perpWallDist;
        const floorX = weight * floorXWall + (1 - weight) * playerPos.x;
        const floorY = weight * floorYWall + (1 - weight) * playerPos.y;
        let tx = ((textureSize.x * floorX) | 0) & (textureSize.x - 1);
        let ty = ((textureSize.y * floorY) | 0) & (textureSize.y - 1);
        const texOffset = (ty * textureSize.x + tx) * 4;
        const brightness = 1 - Math.min(0.8, Math.max(0, rowDistance / 10));
        const y = (canvas.height - yFloor - 1);
        const offset = y * 4;
        stripe.data[offset] = floorTexture.data[texOffset] * brightness;
        stripe.data[offset + 1] = floorTexture.data[texOffset + 1] * brightness;
        stripe.data[offset + 2] = floorTexture.data[texOffset + 2] * brightness;
        stripe.data[offset + 3] = 255;
        yFloor++;
    }
    return yFloor;
}

export function renderWall(
    canvas: HTMLCanvasElement,
    stripe: ImageData,
    wallHeight: number,
    wallX: number,
    wallY: number,
    perpWallDist: number,
    side: number,
    rayDir: Vec2,
    wallTexture: ImageData,
) {

    const brightness = 1 - Math.min(0.8, Math.max(0, (perpWallDist - side) / 10));

    let texX: number = wallX * textureSize.x | 0;
    if (side === 0 && rayDir.x > 0) {
        texX = textureSize.x - texX - 1;
    }
    if (side === 1 && rayDir.y < 0) {
        texX = textureSize.x - texX - 1;
    }
    const yStart = Math.max(wallY, 0);
    const yEnd = Math.min(wallY + wallHeight, canvas.height);

    const step = textureSize.y * perpWallDist / canvas.height;
    let texPos = wallY < yStart ? (yStart - wallY) * step : 0;

    for (let y = yStart; y < yEnd; y++) {
      const offset = y * 4;
      const texY = texPos & (textureSize.y - 1);
      texPos += step;
      let texture = wallTexture;
      const texOffset = (texY * textureSize.x + texX) * 4;
      stripe.data[offset] = texture.data[texOffset] * brightness;
      stripe.data[offset + 1] = texture.data[texOffset + 1] * brightness;
      stripe.data[offset + 2] = texture.data[texOffset + 2] * brightness;
      stripe.data[offset + 3] = 255;
    }
}

