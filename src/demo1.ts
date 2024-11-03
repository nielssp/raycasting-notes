import { Vec2, add2, attachRenderFunction, initCanvas, mul2, set2 } from './util';

// Demo 1
// Basic raycasting

// Structure for keeping track of player inputs
export interface PlayerInputs {
    moveForward: boolean;
    moveBackward: boolean;
    turnLeft: boolean;
    turnRight: boolean;
    rotationSpeed: number;
}

// A single map cell
export interface Cell {
    // Walls are solid
    solid: boolean;
}

// Map created from array of strings. 'X' is a wall, ' ' is open space.
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
    // Player/camera position vector
    const playerPos: Vec2 = {x: 2, y: 3};
    // Player/camera direction unit vector
    const playerDir: Vec2 = {x: 1, y: 0};

    // Initial player input states
    const playerInputs: PlayerInputs = {
        moveForward: false,
        moveBackward: false,
        turnLeft: false,
        turnRight: false,
        rotationSpeed: 0,
    };

    const setPos = (dest: Vec2) => setPlayerPos(playerPos, dest, map, mapSize);

    const [canvas, ctx] = initCanvas('canvas1');
    const aspectRatio = canvas.width / canvas.height;
    const repaint = attachRenderFunction(canvas, dt => {
        updatePosition(dt, playerInputs, playerPos, playerDir, setPos);
        renderBackground(canvas, ctx);
        renderEnv(canvas, ctx, aspectRatio, playerPos, playerDir);
    });
    attachKeyboard(canvas, playerInputs);
    attachMouse(canvas, repaint, playerPos, playerDir, setPos);
    attachTouch(canvas, repaint, playerPos, playerDir, setPos);
}

// Position handling

export function setPlayerPos(
    playerPos: Vec2,
    newPlayerPos: Vec2,
    map: Cell[][],
    mapSize: Vec2,
) {
    if (checkDestination(newPlayerPos, map, mapSize)) {
        set2(playerPos, newPlayerPos);
    }
}

export function updatePosition(
    dt: number,
    playerInputs: PlayerInputs,
    playerPos: Vec2,
    playerDir: Vec2,
    setPos: (dest: Vec2) => void,
) {
    if (playerInputs.moveForward || playerInputs.moveBackward) {
        // Move forward or backward by adding or subtracting the direction vector multiplied by
        // the movement speed
        const moveSpeed = dt * 3;
        const newPos = {...playerPos};
        if (playerInputs.moveForward) {
            newPos.x += moveSpeed * playerDir.x;
            newPos.y += moveSpeed * playerDir.y;
        } else {
            newPos.x -= moveSpeed * playerDir.x;
            newPos.y -= moveSpeed * playerDir.y;
        }
        setPos(newPos);
    }

    if (playerInputs.turnLeft || playerInputs.turnRight) {
        // Apply acceleration to better allow for small adjustments
        const rotSpeed = dt * 3;
        const rotAccel = dt * 0.6;
        if (playerInputs.turnLeft) {
            playerInputs.rotationSpeed = Math.max(-rotSpeed, Math.min(0, playerInputs.rotationSpeed) - rotAccel);
        } else {
            playerInputs.rotationSpeed = Math.min(rotSpeed, Math.max(0, playerInputs.rotationSpeed) + rotAccel);
        }
        // Rotate direction vector
        set2(playerDir, {
            x: playerDir.x * Math.cos(playerInputs.rotationSpeed) - playerDir.y * Math.sin(playerInputs.rotationSpeed),
            y: playerDir.x * Math.sin(playerInputs.rotationSpeed) + playerDir.y * Math.cos(playerInputs.rotationSpeed),
        });
    } else {
        playerInputs.rotationSpeed = 0;
    }
}

// Checks whether the given position is inside a wall
export function checkDestination(
    pos: Vec2,
    map: Cell[][],
    mapSize: Vec2,
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

// Update player input states based on keyboard events
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
    setPos: (dest: Vec2) => void,
) {
    let dragging = false;
    canvas.addEventListener('mousedown', () => {
        dragging = true;
    });
    document.addEventListener('mousemove', e => {
        if (!dragging) {
            return;
        }
        // Add or subtract direction vector from position when moving mouse up
        // and down
        const moveSpeed = -0.005 * e.movementY;
        const newPos = add2(playerPos, mul2(moveSpeed, playerDir));
        setPos(newPos);

        // Rotate direction vector when moving mouse left and right
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
    setPos: (dest: Vec2) => void,
) {
    let touch: Touch | undefined;
    canvas.addEventListener('touchstart', e => {
        if (e.changedTouches.length) {
            e.preventDefault();
            touch = e.changedTouches[0];
            canvas.focus();
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
        setPos(newPos);

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
) {
    // The camera plane vector is a vector perpendicular to the player direction
    // vector moving from screen left to screen right
    const cameraPlane = getCameraPlane(playerDir);
    for (let x = 0; x < canvas.width; x++) {
        const ray = createRay(canvas, aspectRatio, playerPos, playerDir, x, cameraPlane);
        while (true) {
            advanceRay(ray);
            const cell = getMapCell(map, ray.mapPos, mapSize)
            if (!cell) {
                // Outside of map
                break;
            } else if (cell.solid) {
                // The ray hit a wall, render it
                renderWall(canvas, ctx, ray);
                break;
            }
        }
    }
}

export function getCameraPlane(playerDir: Vec2): Vec2 {
    return {
        x: -playerDir.y,
        y: playerDir.x,
    };
}

export function getMapCell<T>(map: T[][], mapPos: Vec2, mapSize: Vec2): T | undefined {
    if (mapPos.x < 0 || mapPos.x >= mapSize.x || mapPos.y < 0 || mapPos.y >= mapSize.y) {
        return undefined;
    } else {
        return map[mapPos.y][mapPos.x];
    }
}

export interface Ray {
    x: number;
    rayDir: Vec2;
    mapPos: Vec2;
    deltaDist: Vec2;
    sideDist: Vec2;
    step: Vec2;
    side: 0 | 1;
    perpWallDist: number;
}

export function createRay(
    canvas: HTMLCanvasElement,
    aspectRatio: number,
    playerPos: Vec2,
    playerDir: Vec2,
    x: number,
    cameraPlane: Vec2,
): Ray {
    // A number from -aspectRatio/2 to +aspectRatio/2 where 0 represents the
    // center of the screen.
    const cameraX = aspectRatio * x / canvas.width - aspectRatio / 2;
    // Scale camera plane vector by the number above then add it to the player
    // direction to get the current ray direction vector
    const rayDir = add2(playerDir, mul2(cameraX, cameraPlane));
    // The initial map position is the integer parts of the player position
    // vector
    const mapPos = {x: Math.floor(playerPos.x), y: Math.floor(playerPos.y)};
    const deltaDist = {
        x: Math.abs(1 / rayDir.x),
        y: Math.abs(1 / rayDir.y),
    };
    const sideDist = {x: 0, y: 0};
    const step = {x: 0, y: 0};
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
    return {x, rayDir, mapPos, deltaDist, sideDist, step, side: 0, perpWallDist: 0};
}

export function advanceRay(
    ray: Ray,
) {
    if (ray.sideDist.x < ray.sideDist.y) {
        ray.perpWallDist = ray.sideDist.x;
        ray.sideDist.x += ray.deltaDist.x;
        ray.mapPos.x += ray.step.x;
        ray.side = 0;
    } else {
        ray.perpWallDist = ray.sideDist.y;
        ray.sideDist.y += ray.deltaDist.y;
        ray.mapPos.y += ray.step.y;
        ray.side = 1;
    }
}

export function getWallHeight(canvasHeight: number, dist: number): {wallHeight: number, wallY: number} {
    const wallHeight = Math.ceil(canvasHeight / dist);
    const wallY = Math.floor((canvasHeight - wallHeight) / 2);
    return {wallHeight, wallY};
}

export function renderWall(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    ray: Ray,
) {
    const {wallHeight, wallY} = getWallHeight(canvas.height, ray.perpWallDist);

    ctx.strokeStyle = ray.side ? '#005566' : '#003F4C';
    ctx.beginPath()
    ctx.moveTo(ray.x + 0.5, Math.max(wallY, 0));
    ctx.lineTo(ray.x + 0.5, Math.min(wallY + wallHeight + 1, canvas.height));
    ctx.stroke();
}
