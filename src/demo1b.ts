import { Cell } from './demo1';
import { Vec2, add2, mul2, sleep } from './util';

export const map: Cell[][] = [
    'XXXXXXXXXX',
    'X        X',
    'X        X',
    'X      X X',
    'X     XX X',
    'X        X',
    'X     XXXX',
    'XXXXXXXXXX',
].map(row => row.split('').map(cell => {
    return {
        solid: cell === 'X',
    };
}));
export const mapSize: Vec2 = {
    x: map[0].length,
    y: map.length,
};


export function initDemo1b() {
    const playerPos: Vec2 = {x: 2, y: 3};
    const playerDir: Vec2 = {x: 1, y: 0};

    const canvas = document.getElementById('canvas1b') as HTMLCanvasElement;

    const cellSize = canvas.width / mapSize.x;
    canvas.height = mapSize.y * cellSize;

    //canvas.style.imageRendering = 'pixelated';

    const ctx = canvas.getContext('2d')!;
    //ctx.imageSmoothingEnabled = false;

    renderMapGrid(canvas, ctx, map, mapSize, cellSize);

    ctx.fillStyle = '#F60';
    ctx.beginPath();
    ctx.arc(
        playerPos.x * cellSize,
        playerPos.y * cellSize,
        cellSize / 4,
        0,
        Math.PI * 2,
    );
    ctx.fill();
    ctx.strokeStyle = '#F60';

    const aspectRatio = 320 / 200;

    renderEnv(canvas, ctx, aspectRatio, playerPos, playerDir, cellSize);
}

export function renderMapGrid(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    map: Cell[][],
    mapSize: Vec2,
    cellSize: number,
) {
    ctx.strokeStyle = '#333';
    for (let y = 0; y < mapSize.y; y++) {
        for (let x = 0; x < mapSize.x; x++) {
            const cell = map[y][x];
            if (cell.solid) {
                ctx.fillStyle = '#056';
            } else {
                ctx.fillStyle = '#666';
            }
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
    }
}

export async function renderEnv(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    aspectRatio: number,
    playerPos: Vec2,
    playerDir: Vec2,
    cellSize: number,
) {
    const sideDist = {x: 0, y: 0};
    let perpWallDist = 0;
    let step = {x: 0, y: 0};
    const cameraPlane = {
        x: -playerDir.y,
        y: playerDir.x,
    };
    for (let x = 0; x < 320; x++) {
        const cameraX = aspectRatio * x / 320 - aspectRatio / 2;
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

        ctx.strokeStyle = '#fff';
        let previous = {
            x: playerPos.x * cellSize,
            y: playerPos.y * cellSize,
        };
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
            const next = {
                x: (playerPos.x + rayDir.x * perpWallDist) * cellSize,
                y: (playerPos.y + rayDir.y * perpWallDist) * cellSize,
            };
            ctx.beginPath();
            ctx.moveTo(previous.x, previous.y);
            ctx.lineTo(next.x, next.y);
            ctx.stroke();
            previous = next;
            await sleep(50);
            const cell = map[mapPos.y][mapPos.x];
            if (cell.solid) {
                ctx.fillStyle = '#F00';
                ctx.beginPath();
                ctx.arc(
                    next.x,
                    next.y,
                    3,
                    0,
                    Math.PI * 2,
                );
                ctx.fill();
                break;
            } else {
                ctx.fillStyle = '#0F0';
                ctx.beginPath();
                ctx.arc(
                    next.x,
                    next.y,
                    3,
                    0,
                    Math.PI * 2,
                );
                ctx.fill();
            }
        }
    }
}
