import { PlayerInputs, attachKeyboard, attachMouse, attachTouch, renderBackground, renderEnv, updatePosition } from './demo1';
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

    const [canvas, ctx] = initCanvas('canvas2');
    const aspectRatio = canvas.width / canvas.height;
    const repaint = attachRenderFunction(canvas, dt => {
        updatePosition(dt, playerInputs, playerPos, playerDir);
        renderBackground(canvas, ctx);
        renderEnv(canvas, ctx, aspectRatio, playerPos, playerDir, renderWall);
    });
    attachKeyboard(canvas, playerInputs);
    attachMouse(canvas, repaint, playerPos, playerDir);
    attachTouch(canvas, repaint, playerPos, playerDir);
}

export function renderWall(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    x: number,
    perpWallDist: number,
    side: number,
) {
    const wallHeight = Math.ceil(canvas.height / perpWallDist);
    const wallY = Math.floor((canvas.height - wallHeight) / 2);

    const brightness = 1 - Math.min(0.8, Math.max(0, (perpWallDist - side) / 10));
    ctx.strokeStyle = `rgb(0, ${85 * brightness}, ${102 * brightness})`;

    ctx.beginPath()
    ctx.moveTo(x + 0.5, Math.max(wallY, 0));
    ctx.lineTo(x + 0.5, Math.min(wallY + wallHeight + 1, canvas.height));
    ctx.stroke();
}
