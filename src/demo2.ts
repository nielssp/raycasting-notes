import { PlayerInputs, Ray, advanceRay, attachKeyboard, attachMouse, attachTouch, createRay, getCameraPlane, getMapCell, getWallHeight, map, mapSize, setPlayerPos, updatePosition } from './demo1';
import { Vec2, attachRenderFunction, initCanvas } from './util';

export function initDemo2() {
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

    const [canvas, ctx] = initCanvas('canvas2');
    const aspectRatio = canvas.width / canvas.height;
    const sky = createSky(canvas, ctx);
    const repaint = attachRenderFunction(canvas, dt => {
        updatePosition(dt, playerInputs, playerPos, playerDir, setPos);
        renderBackground(canvas, ctx, sky);
        renderEnv(canvas, ctx, aspectRatio, playerPos, playerDir);
    });
    attachKeyboard(canvas, playerInputs);
    attachMouse(canvas, repaint, playerPos, playerDir, setPos);
    attachTouch(canvas, repaint, playerPos, playerDir, setPos);
}

export function createSky(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, '#333');
    sky.addColorStop(0.5, '#111');
    sky.addColorStop(0.5, '#222');
    sky.addColorStop(1, '#666');
    return sky;
}

export function renderBackground(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    sky: CanvasGradient,
) {
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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
        while (true) {
            advanceRay(ray);
            const cell = getMapCell(map, ray.mapPos, mapSize)
            if (!cell) {
                break;
            } else if (cell.solid) {
                renderWall(canvas, ctx, ray);
                break;
            }
        }
    }
}

export function getBrightness(dist: number, side: 0 | 1 = 0) {
    return 1 - Math.min(0.8, Math.max(0, (dist - side) / 10));
}

export function renderWall(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    ray: Ray,
) {
    const {wallHeight, wallY} = getWallHeight(canvas.height, ray.perpWallDist);

    const brightness = getBrightness(ray.perpWallDist, ray.side);
    ctx.strokeStyle = `rgb(0, ${85 * brightness}, ${102 * brightness})`;

    ctx.beginPath()
    ctx.moveTo(ray.x + 0.5, Math.max(wallY, 0));
    ctx.lineTo(ray.x + 0.5, Math.min(wallY + wallHeight + 1, canvas.height));
    ctx.stroke();
}
