import { PlayerInputs, attachKeyboard, attachMouse, attachTouch, renderEnv, updatePosition } from './demo1';
import { createSky, renderBackground } from './demo2';
import { Vec2, attachRenderFunction, initCanvas } from './util';

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

    const wallTexture: ImageData = await loadTextureData('/assets/content/misc/textures/wall2.png');

    const [canvas, ctx] = initCanvas('canvas3');
    const aspectRatio = canvas.width / canvas.height;
    const sky = createSky(canvas, ctx);
    const repaint = attachRenderFunction(canvas, dt => {
        updatePosition(dt, playerInputs, playerPos, playerDir);
        renderBackground(canvas, ctx, sky);
        renderEnv(canvas, ctx, aspectRatio, playerPos, playerDir, (canvas, ctx, x, perpWallDist, side, rayDir: Vec2) => {
            renderWall(canvas, ctx, x, perpWallDist, side, rayDir, wallTexture, playerPos);
        });
    });
    attachKeyboard(canvas, playerInputs);
    attachMouse(canvas, repaint, playerPos, playerDir);
    attachTouch(canvas, repaint, playerPos, playerDir);
}

export function loadTextureData(src: string): Promise<ImageData> {
  const img = new Image();
  img.src = src;
  return new Promise((resolve, reject) => {
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = img.width;
      canvas.height = img.height;
      context.drawImage(img, 0, 0);
      resolve(context.getImageData(0, 0, canvas.width, canvas.height));
    };
    img.onerror = reject;
  });
}

export function renderWall(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    x: number,
    perpWallDist: number,
    side: number,
    rayDir: Vec2,
    wallTexture: ImageData,
    playerPos: Vec2,
) {
    const wallHeight = Math.ceil(canvas.height / perpWallDist);
    const wallY = Math.floor((canvas.height - wallHeight) / 2);

    const brightness = 1 - Math.min(0.8, Math.max(0, (perpWallDist - side) / 10));

    let wallX: number;
    if (side === 0) {
        wallX = playerPos.y + perpWallDist * rayDir.y;
    } else {
        wallX = playerPos.x + perpWallDist * rayDir.x;
    }
    wallX -= wallX | 0;

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

    const stripe = ctx.getImageData(x, 0, 1, canvas.height);

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

    ctx.putImageData(stripe, x, 0);
}

