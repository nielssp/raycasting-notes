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

    if (canvas.parentElement) {
        const width = canvas.parentElement.clientWidth;
        canvas.width = canvas.parentElement.clientWidth * devicePixelRatio;
        canvas.style.width = `${width}px`;
    }
    const cellSize = canvas.width / mapSize.x;
    canvas.height = mapSize.y * cellSize;

    //canvas.style.imageRendering = 'pixelated';

    const ctx = canvas.getContext('2d')!;
    //ctx.imageSmoothingEnabled = false;

    renderMapGrid(ctx, map, mapSize, cellSize);
    renderPlayerPos(ctx, playerPos, cellSize);

    const aspectRatio = 320 / 200;

    renderEnv(ctx, aspectRatio, playerPos, playerDir, cellSize);
}

export function renderPlayerPos(
    ctx: CanvasRenderingContext2D,
    playerPos: Vec2,
    cellSize: number,
) {
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
}

export function renderMapGrid(
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
    ctx: CanvasRenderingContext2D,
    aspectRatio: number,
    playerPos: Vec2,
    playerDir: Vec2,
    cellSize: number,
) {
    while (true) {
        const sideDist = {x: 0, y: 0};
        let perpWallDist = 0;
        let step = {x: 0, y: 0};
        const cameraPlane = {
            x: -playerDir.y,
            y: playerDir.x,
        };
        const points: Vec2[] = [];
        for (let x = 0; x < 32; x++) {
            const cameraX = aspectRatio * x / 32 - aspectRatio / 2;
            const rayDir = add2(playerDir, mul2(cameraX, cameraPlane));
            const mapPos = {x: Math.floor(playerPos.x), y: Math.floor(playerPos.y)};
            const deltaDist = {
                x: Math.abs(1 / rayDir.x),
                y: Math.abs(1 / rayDir.y),
            };
            if (rayDir.x < 0) {
                step.x = -1;
                sideDist.x = (playerPos.x - mapPos.x) * deltaDist.x;
            } else {
                step.x = 1;
                sideDist.x = (1 - playerPos.x + mapPos.x) * deltaDist.x;
            }
            if (rayDir.y < 0) {
                step.y = -1;
                sideDist.y = (playerPos.y - mapPos.y) * deltaDist.y;
            } else {
                step.y = 1;
                sideDist.y = (1 - playerPos.y + mapPos.y) * deltaDist.y;
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
                if (perpWallDist === 0) {
                    continue;
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
                await sleep(100);
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
                    points.push(next);
                    break;
                } else {
                    ctx.fillStyle = side ? '#0F0' : '#00F';
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
            await sleep(200);
            renderMapGrid(ctx, map, mapSize, cellSize);
            renderPlayerPos(ctx, playerPos, cellSize);
            for (const point of points) {
                ctx.fillStyle = '#F00';
                ctx.beginPath();
                ctx.arc(
                    point.x,
                    point.y,
                    3,
                    0,
                    Math.PI * 2,
                );
                ctx.fill();
            }
        }
    }
}
