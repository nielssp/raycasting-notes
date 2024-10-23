import { Vec2, add2, attachRenderFunction, initCanvas, mul2, set2 } from './util';

export interface PlayerInputs {
    moveForward: boolean;
    moveBackward: boolean;
    turnLeft: boolean;
    turnRight: boolean;
    rotationSpeed: number;
}

export interface Cell {
    solid: boolean;
}

export const map: Cell[][] = [
    'XXXXXXXXXXXXXXXXXXXX',
    'X        X         X',
    'X        X         X',
    'X      X X   X     X',
    'X     XX X   X     X',
    'X        X   X     X',
    'X     XXXXXXXX     X',
    'X                  X',
    'X                  X',
    'X                  X',
    'XXXXXXXXXXXXXXXXXXXX',
].map(row => row.split('').map(cell => {
    return {
        solid: cell === 'X',
    };
}));
export const mapSize: Vec2 = {
    x: map[0].length,
    y: map.length,
};

export function initDemo1() {
    const playerPos: Vec2 = {x: 2, y: 3};
    const playerDir: Vec2 = {x: 1, y: 0};
    const playerInputs: PlayerInputs = {
        moveForward: false,
        moveBackward: false,
        turnLeft: false,
        turnRight: false,
        rotationSpeed: 0,
    };

    const [canvas, ctx] = initCanvas('canvas1');
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

// Position handling

export function updatePosition(
    dt: number,
    playerInputs: PlayerInputs,
    playerPos: Vec2,
    playerDir: Vec2,
) {
    if (playerInputs.moveForward || playerInputs.moveBackward) {
        const moveSpeed = dt * 3;
        const newPos = {...playerPos};
        if (playerInputs.moveForward) {
            newPos.x += moveSpeed * playerDir.x;
            newPos.y += moveSpeed * playerDir.y;
        } else {
            newPos.x -= moveSpeed * playerDir.x;
            newPos.y -= moveSpeed * playerDir.y;
        }
        if (checkDestination(newPos)) {
            set2(playerPos, newPos);
        }
    }

    if (playerInputs.turnLeft || playerInputs.turnRight) {
        const rotSpeed = dt * 3;
        const rotAccel = dt * 0.6;
        if (playerInputs.turnLeft) {
            playerInputs.rotationSpeed = Math.max(-rotSpeed, Math.min(0, playerInputs.rotationSpeed) - rotAccel);
        } else {
            playerInputs.rotationSpeed = Math.min(rotSpeed, Math.max(0, playerInputs.rotationSpeed) + rotAccel);
        }
        set2(playerDir, {
            x: playerDir.x * Math.cos(playerInputs.rotationSpeed) - playerDir.y * Math.sin(playerInputs.rotationSpeed),
            y: playerDir.x * Math.sin(playerInputs.rotationSpeed) + playerDir.y * Math.cos(playerInputs.rotationSpeed),
        });
    } else {
        playerInputs.rotationSpeed = 0;
    }
}

export function checkDestination(
    pos: Vec2,
): boolean {
    const mapPos = {x: pos.x | 0, y: pos.y | 0};
    if (mapPos.x < 0 || mapPos.x >= mapSize.x || mapPos.y < 0 || mapPos.y >= mapSize.y) {
        return false;
    }
    return !map[mapPos.y][mapPos.x].solid;
}

// Keyboard handling

export function attachKeyboard(canvas: HTMLCanvasElement, playerInputs: PlayerInputs) {
    canvas.addEventListener('keydown', e => updateInputs(e, true, playerInputs));
    canvas.addEventListener('keyup', e => updateInputs(e, false, playerInputs));
}

export function updateInputs(e: KeyboardEvent, state: boolean, playerInputs: PlayerInputs) {
    switch (e.key) {
        case 'ArrowLeft':
            case 'a':
            playerInputs.turnLeft = state;
        break;
        case 'ArrowRight':
            case 'd':
            playerInputs.turnRight = state;
        break;
        case 'ArrowUp':
            case 'w':
            playerInputs.moveForward = state;
        break;
        case 'ArrowDown':
            case 's':
            playerInputs.moveBackward = state;
        break;
        default:
            return;
    }
    e.preventDefault();
}

// Mouse handling

export function attachMouse(
    canvas: HTMLCanvasElement,
    repaint: () => void,
    playerPos: Vec2,
    playerDir: Vec2,
) {
    let dragging = false;
    canvas.addEventListener('mousedown', () => {
        dragging = true;
    });
    document.addEventListener('mousemove', e => {
        if (!dragging) {
            return;
        }
        const moveSpeed = -0.005 * e.movementY;
        const newPos = add2(playerPos, mul2(moveSpeed, playerDir));
        if (checkDestination(newPos)) {
            set2(playerPos, newPos);
        }

        const rotSpeed = 0.005 * e.movementX;
        set2(playerDir, {
            x: playerDir.x * Math.cos(rotSpeed) - playerDir.y * Math.sin(rotSpeed),
            y: playerDir.x * Math.sin(rotSpeed) + playerDir.y * Math.cos(rotSpeed),
        });
        repaint();
    });
    document.addEventListener('mouseup', () => {
        dragging = false;
    });
    canvas.addEventListener('dblclick', () => {
        if (document.fullscreenElement === canvas) {
            document.exitFullscreen();
        } else {
            canvas.requestFullscreen();
        }
    });
}

// Touch handling

export function attachTouch(
    canvas: HTMLCanvasElement,
    repaint: () => void,
    playerPos: Vec2,
    playerDir: Vec2,
) {
    let touch: Touch | undefined;
    canvas.addEventListener('touchstart', e => {
        if (e.changedTouches.length) {
            e.preventDefault();
            touch = e.changedTouches[0];
        }
    })
    document.addEventListener('touchmove', e => {
        if (!touch) {
            return;
        }
        const movement = {x: 0, y: 0};
        for (const t of e.changedTouches) {
            if (t.identifier === touch.identifier) {
                movement.x = t.pageX - touch.pageX;
                movement.y = t.pageY - touch.pageY;
                touch = t;
                break;
            }
        }

        const moveSpeed = 0.005 * movement.y;
        const newPos = add2(playerPos, mul2(moveSpeed, playerDir));
        if (checkDestination(newPos)) {
            set2(playerPos, newPos);
        }

        const rotSpeed = -0.005 * movement.x;
        set2(playerDir, {
            x: playerDir.x * Math.cos(rotSpeed) - playerDir.y * Math.sin(rotSpeed),
            y: playerDir.x * Math.sin(rotSpeed) + playerDir.y * Math.cos(rotSpeed),
        });
        repaint();
    });
    document.addEventListener('touchend', () => {
        touch = undefined;
    });
    document.addEventListener('touchcancel', () => {
        touch = undefined;
    });
}

// Rendering

export function renderBackground(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
) {
    // Sky
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, canvas.width, canvas.height / 2);

    // Ground
    ctx.fillStyle = '#666';
    ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);
}

export function renderEnv(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    aspectRatio: number,
    playerPos: Vec2,
    playerDir: Vec2,
    renderWall: (
        canvas: HTMLCanvasElement,
        ctx: CanvasRenderingContext2D,
        x: number,
        perpWallDist: number,
        side: number,
        rayDir: Vec2,
        cell: Cell,
    ) => void,
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
            if (cell.solid) {
                renderWall(canvas, ctx, x, perpWallDist, side, rayDir, cell);
                break;
            }
        }
    }
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

    ctx.strokeStyle = side ? '#005566' : '#003F4C';
    ctx.beginPath()
    ctx.moveTo(x + 0.5, Math.max(wallY, 0));
    ctx.lineTo(x + 0.5, Math.min(wallY + wallHeight + 1, canvas.height));
    ctx.stroke();
}
