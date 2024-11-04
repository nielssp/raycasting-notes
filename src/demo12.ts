import { PlayerInputs, Ray, advanceRay, createRay, getCameraPlane, getMapCell, updatePosition } from './demo1';
import { Cell, Door, Sprite, WallMeasurements, applyGravity, applyMapTextures, attachInputs, createSky, createSprite, getWallMeasurements, map as map11, mapSize, setPlayerPos } from './demo11';
import { getBrightness, renderBackground } from './demo2';
import { textureSize } from './demo3';
import { FloorMeasurements, getFloorMeasurements } from './demo5';
import { doorEnd, doorStart, updateAnimations } from './demo8';
import { Vec2, Vec3, attachRenderFunction, initCanvas, loadTextureData, sub2 } from './util';

const map: Cell[][] = map11.map(r => r.map(c => {
    return {
        ...c,
        door: c.door && {...c.door},
    };
}));

export async function initDemo12() {
    const playerPos: Vec3 = {x: 2, y: 3, z: 1};
    const playerDir: Vec2 = {x: 1, y: 0};
    const playerVel: Vec3 = {x: 0, y: 0, z: 0};
    const playerInputs: PlayerInputs = {
        moveForward: false,
        moveBackward: false,
        turnLeft: false,
        turnRight: false,
        rotationSpeed: 0,
    };

    const setPos = (dest: Vec2) => setPlayerPos(playerPos, dest, map, mapSize);

    const textures: Partial<Record<string, ImageData>> = Object.fromEntries(await Promise.all(Object.entries({
        W: loadRotatedTextureData('/assets/content/misc/textures/wall2.png'),
        F: loadRotatedTextureData('/assets/content/misc/textures/floor.png'),
        C: loadRotatedTextureData('/assets/content/misc/textures/ceiling.png'),
        D: loadRotatedTextureData('/assets/content/misc/textures/door.png'),
        d: loadRotatedTextureData('/assets/content/misc/textures/door-side.png'),
    }).map(async ([k, p]) => [k, await p])));
    applyMapTextures(map, textures);

    map[6][2].door = {
        doorTexture: textures['D'],
        sideTexture: textures['d'],
        offset: 0,
        active: false,
        open: false,
    };

    const animations: ((dt: number) => boolean)[] = [];

    const sprites: Sprite[] = [];
    const barrelTexture = await loadRotatedTextureData('/assets/content/misc/textures/barrel.png');
    sprites.push(createSprite({x: 3, y: 4, z: 1}, barrelTexture));
    sprites.push(createSprite({x: 4, y: 3.75, z: 1}, barrelTexture));
    sprites.push(createSprite({x: 7.5, y: 9.5, z: 2}, barrelTexture));

    const [canvas, ctx] = initCanvas('canvas12');
    ctx.transform(0, 1, 1, 0, 0, 0);
    const zBuffer = Array(canvas.width * canvas.height);
    const aspectRatio = canvas.width / canvas.height;
    const sky = createSky(canvas, ctx);

    const rotated = document.createElement('canvas');
    rotated.width = canvas.height;
    rotated.height = canvas.width;
    const rotatedCtx = rotated.getContext('2d')!;
    rotatedCtx.transform(0, 1, 1, 0, 0, 0);

    const repaint = attachRenderFunction(canvas, dt => {
        updatePosition(dt, playerInputs, playerPos, playerDir, setPos);
        updateAnimations(animations, dt);
        applyGravity(playerPos, playerVel, map, dt);
        const cameraPlane = getCameraPlane(playerDir);
        renderBackground(canvas, rotatedCtx, sky);
        renderEnv(canvas, rotatedCtx, aspectRatio, playerPos, playerDir, cameraPlane, zBuffer)
        renderSprites(canvas, rotatedCtx, aspectRatio, sprites, zBuffer, playerPos, playerDir, cameraPlane);
        ctx.drawImage(rotated, 0, 0, rotated.width, rotated.height, 0, 0, rotated.width, rotated.height);
    });
    attachInputs(canvas, aspectRatio, playerInputs, repaint, playerPos, playerDir, playerVel, setPos, map, mapSize, animations);
}

export async function loadRotatedTextureData(path: string): Promise<ImageData> {
    const data = await loadTextureData(path);
    const canvas = document.createElement('canvas');
    canvas.width = textureSize.x;
    canvas.height = textureSize.y;
    canvas.getContext('2d')!.putImageData(data, 0, 0);
    const rotated = document.createElement('canvas');
    rotated.width = textureSize.y;
    rotated.height = textureSize.x;
    const ctx = rotated.getContext('2d')!;
    ctx.transform(0, 1, 1, 0, 0, 0);
    ctx.drawImage(canvas, 0, 0);
    return ctx.getImageData(0, 0, rotated.width, rotated.height);
}

export function renderEnv(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    aspectRatio: number,
    playerPos: Vec3,
    playerDir: Vec2,
    cameraPlane: Vec2,
    zBuffer: number[],
) {
    for (let x = 0; x < canvas.width; x++) {
        const zBufferOffset = x * canvas.height;
        const ray = createRay(canvas, aspectRatio, playerPos, playerDir, x, cameraPlane);
        const stripe = ctx.getImageData(0, x, canvas.height, 1);

        let yFloor = 0;
        let yCeiling = 0;
        let yFloorMax = canvas.height;
        let yCeilingMax = yFloorMax;

        let floorCell = getMapCell(map, ray.mapPos, mapSize)
        while (true) {
            advanceRay(ray);
            if (canvas.height - yFloor < yCeiling) {
                break;
            }
            if (!ray.perpWallDist) {
                continue;
            }
            const wall = getWallMeasurements(ray, canvas.height, playerPos);
            const floor = getFloorMeasurements(ray, wall.wallX);
            if (floorCell) {
                [yFloor, yCeiling] = renderFloorAndCeiling(canvas, stripe, floorCell, wall, floor, playerPos, ray.perpWallDist,
                    yFloor, yCeiling, yFloorMax, yCeilingMax, zBuffer, zBufferOffset, floorCell.floorTexture, floorCell.ceilingTexture);
            }

            const cell = getMapCell(map, ray.mapPos, mapSize)
            if (!cell) {
                break;
            }

            [yFloor, yCeiling, yFloorMax, yCeilingMax] = renderWall(canvas, stripe, ray, cell, wall, yFloor, yCeiling, yFloorMax, yCeilingMax, playerPos, zBuffer, zBufferOffset, cell.wallTexture);
            if (cell.door) {
                if (renderDoor(canvas, stripe, cell, cell.door, ray, playerPos, floor, yFloor, yCeiling, yFloorMax, yCeilingMax, zBuffer, zBufferOffset)) {
                    break;
                }
            }
            floorCell = cell;
        }
        ctx.putImageData(stripe, 0, x);
    }
}

export function renderWall(
    canvas: HTMLCanvasElement,
    stripe: ImageData,
    ray: Ray,
    cell: Cell,
    wall: WallMeasurements,
    yFloor: number,
    yCeiling: number,
    yFloorMax: number,
    yCeilingMax: number,
    playerPos: Vec3,
    zBuffer: number[],
    zBufferOffset: number,
    wallTexture?: ImageData,
): [number, number, number, number] {
    if (cell.cellHeight <= 0) {
        return [yFloor, yCeiling, yFloorMax, yCeilingMax];
    }
    const wallHeight = Math.ceil(wall.heightMultiplier * cell.cellHeight);
    const wallY = Math.floor(canvas.height / 2 + playerPos.z * wall.heightMultiplier + (0.5 - cell.cellHeight) * wall.heightMultiplier);
    const ceilingY = Math.ceil(wallY + (cell.cellHeight - cell.ceilingHeight) * wall.heightMultiplier);
    const floorY = Math.ceil(wallY + (cell.cellHeight - cell.floorHeight) * wall.heightMultiplier);

    const yStart = Math.max(wallY, yCeiling);
    const yEnd = Math.min(wallY + wallHeight + 1, canvas.height - yFloor);

    if (yStart <= ceilingY || yEnd >= floorY) {
        const brightness = getBrightness(ray.perpWallDist, ray.side);
        let texX: number = wall.wallX * textureSize.x & (textureSize.x - 1);

        const step = textureSize.y * ray.perpWallDist / canvas.height;
        let texPos = wallY < yStart ? (yStart - wallY) * step : 0;
        texPos += (1 - cell.cellHeight + (cell.cellHeight | 0)) * textureSize.y;

        for (let y = yStart; y < yEnd; y++) {
            texPos += step;
            if (y > ceilingY && y < floorY) {
                continue;
            }
            const texY = texPos & (textureSize.y - 1);
            const offset = y * 4;
            if (wallTexture) {
                const texOffset = (texX * textureSize.x + texY) * 4;
                if (texOffset >= wallTexture.data.length) {
                    console.warn({texOffset, texX, texY, wall});
                }
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
            zBuffer[zBufferOffset + y] = ray.perpWallDist;
        }
    }
    return [
        Math.max(yFloor, canvas.height - floorY),
        Math.max(yCeiling, ceilingY),
        Math.min(yFloorMax, canvas.height - ceilingY),
        Math.min(yCeilingMax, floorY),
    ];
}

export function renderDoor(
    canvas: HTMLCanvasElement,
    stripe: ImageData,
    cell: Cell,
    door: Door,
    ray: Ray,
    playerPos: Vec3,
    floor: FloorMeasurements,
    yFloor: number,
    yCeiling: number,
    yFloorMax: number,
    yCeilingMax: number,
    zBuffer: number[],
    zBufferOffset: number,
): boolean {
    const floorDist = ray.perpWallDist;
    let doorX: number;
    if (ray.side === 0) {
        doorX = playerPos.y + (ray.sideDist.x - ray.deltaDist.x * doorEnd) * ray.rayDir.y;
    } else {
        doorX = playerPos.x + (ray.sideDist.y - ray.deltaDist.y * doorEnd) * ray.rayDir.x;
    }
    let doorMapX = Math.floor(doorX);
    let doorSide = false;
    if (doorX - doorMapX < door.offset) {
        // The door is partially open and we're looking through the opening
        doorSide = true;
        if (ray.side === 0) {
            doorX = playerPos.x + (ray.sideDist.y - ray.deltaDist.y * (1 - door.offset)) * ray.rayDir.x;
        } else {
            doorX = playerPos.y + (ray.sideDist.x - ray.deltaDist.x * (1 - door.offset)) * ray.rayDir.y;
        }
        let doorMapX = Math.floor(doorX);
        if (doorX - doorMapX < doorStart || doorX - doorMapX > doorEnd) {
            return false;
        } else if (ray.side === 1 && doorMapX === ray.mapPos.y && ray.rayDir.x > 0) {
            ray.side = 0;
            ray.perpWallDist = ray.sideDist.x - ray.deltaDist.x * (1 - door.offset);
            ray.sideDist.x += ray.deltaDist.x * door.offset;
        } else if (ray.side === 0 && doorMapX === ray.mapPos.x && ray.rayDir.y > 0) {
            ray.side = 1;
            ray.perpWallDist = ray.sideDist.y - ray.deltaDist.y * (1 - door.offset);
            ray.sideDist.y += ray.deltaDist.y * door.offset;
        } else {
            return false;
        }
    } else if (ray.side === 0 && doorMapX === ray.mapPos.y) {
        ray.perpWallDist = ray.sideDist.x - ray.deltaDist.x * doorEnd;
        ray.sideDist.x += ray.deltaDist.x * doorStart;
    } else if (ray.side === 1 && doorMapX === ray.mapPos.x) {
        ray.perpWallDist = ray.sideDist.y - ray.deltaDist.y * doorEnd;
        ray.sideDist.y += ray.deltaDist.y * doorStart;
    } else {
        return false;
    }
    const wall = getWallMeasurements(ray, canvas.height, playerPos);
    if (!doorSide) {
        wall.wallX -= door.offset;
    }
    [yFloor, yCeiling] = renderFloorAndCeiling(canvas, stripe, cell, wall, floor, playerPos, floorDist, yFloor, yCeiling, yFloorMax, yCeilingMax, zBuffer, zBufferOffset, cell.floorTexture, cell.ceilingTexture);
    const doorTexture = doorSide ? door.sideTexture : door.doorTexture;
    const brightness = getBrightness(ray.perpWallDist, ray.side);

    let texX: number = wall.wallX * textureSize.x | 0;
    const wallHeight = Math.ceil(wall.heightMultiplier * cell.cellHeight);
    const wallY = Math.floor(canvas.height / 2 + playerPos.z * wall.heightMultiplier + (0.5 - cell.cellHeight) * wall.heightMultiplier);
    const yStart = Math.max(wallY, yCeiling);
    const yEnd = Math.min(wallY + wallHeight + 1, canvas.height - yFloor);

    const step = textureSize.y * ray.perpWallDist / canvas.height;
    let texPos = wallY < yStart ? (yStart - wallY) * step : 0;

    for (let y = yStart; y < yEnd; y++) {
        const offset = y * 4;
        const texY = texPos & (textureSize.y - 1);
        texPos += step;
        if (doorTexture) {
            const texOffset = (texX * textureSize.x + texY) * 4;
            stripe.data[offset] = doorTexture.data[texOffset] * brightness;
            stripe.data[offset + 1] = doorTexture.data[texOffset + 1] * brightness;
            stripe.data[offset + 2] = doorTexture.data[texOffset + 2] * brightness;
            stripe.data[offset + 3] = 255;
        } else {
            stripe.data[offset] = 0;
            stripe.data[offset + 1] = 85 * brightness;
            stripe.data[offset + 2] = 102 * brightness;
            stripe.data[offset + 3] = 255;
        }
        zBuffer[zBufferOffset + y] = ray.perpWallDist;
    }
    return true;
}

export function renderFloorAndCeiling(
    canvas: HTMLCanvasElement,
    stripe: ImageData,
    cell: Cell,
    wall: WallMeasurements,
    floor: FloorMeasurements,
    playerPos: Vec3,
    floorDist: number,
    yFloor: number,
    yCeiling: number,
    yFloorMax: number,
    yCeilingMax: number,
    zBuffer: number[],
    zBufferOffset: number,
    floorTexture?: ImageData,
    ceilingTexture?: ImageData,
): [number, number]{
    const cellY = (canvas.height - wall.heightMultiplier) * 0.5;
    const floorCellY = Math.ceil(cellY - playerPos.z * wall.heightMultiplier + cell.floorHeight * wall.heightMultiplier);
    const ceilingCellY = Math.ceil(cellY + playerPos.z * wall.heightMultiplier - (cell.ceilingHeight - 1) * wall.heightMultiplier);
    yFloor = renderFloor(canvas, stripe, cell, floor, floorCellY, playerPos, yFloor, yFloorMax, floorDist,
        zBuffer, zBufferOffset, floorTexture);
    yCeiling = renderCeiling(canvas, stripe, cell, floor, playerPos, ceilingCellY, yCeiling, yCeilingMax, floorDist,
        zBuffer, zBufferOffset, ceilingTexture)
    return [yFloor, yCeiling];
}

export function renderFloor(
    canvas: HTMLCanvasElement,
    stripe: ImageData,
    cell: Cell,
    floor: FloorMeasurements,
    floorCellY: number,
    playerPos: Vec3,
    yFloor: number,
    yFloorMax: number,
    perpWallDist: number,
    zBuffer: number[],
    zBufferOffset: number,
    floorTexture?: ImageData,
): number {
    if (!floorTexture) {
        return Math.max(yFloor, Math.min(floorCellY, yFloorMax));
    }
    const zMultiplier = 2 * playerPos.z - 2 * cell.floorHeight + 1;
    while (yFloor < floorCellY && yFloor < yFloorMax) {
        const y = (canvas.height - yFloor - 1);
        mapFloorTexture(canvas, stripe, y, zMultiplier, floor, playerPos, yFloor, perpWallDist, floorTexture);
        zBuffer[zBufferOffset + y] = perpWallDist;
        yFloor++;
    }
    return yFloor;
}

export function renderCeiling(
    canvas: HTMLCanvasElement,
    stripe: ImageData,
    cell: Cell,
    floor: FloorMeasurements,
    playerPos: Vec3,
    ceilingCellY: number,
    yCeiling: number,
    yCeilingMax: number,
    perpWallDist: number,
    zBuffer: number[],
    zBufferOffset: number,
    ceilingTexture?: ImageData,
): number {
    if (!ceilingTexture) {
        return Math.max(yCeiling, Math.min(ceilingCellY, yCeilingMax));
    }
    const zMultiplier = -2 * playerPos.z + 2 * cell.ceilingHeight - 1;
    while (yCeiling < ceilingCellY && yCeiling < yCeilingMax) {
        mapFloorTexture(canvas, stripe, yCeiling, zMultiplier, floor, playerPos, yCeiling, perpWallDist, ceilingTexture);
        zBuffer[zBufferOffset + yCeiling] = perpWallDist;
        yCeiling++;
    }
    return yCeiling;
}

export function mapFloorTexture(
    canvas: HTMLCanvasElement,
    stripe: ImageData,
    y: number,
    zMultiplier: number,
    floor: FloorMeasurements,
    playerPos: Vec3,
    yFloor: number,
    perpWallDist: number,
    floorTexture: ImageData,
) {
    const rowDistance = canvas.height * zMultiplier / (canvas.height - 2 * yFloor);
    const weight = rowDistance / perpWallDist;
    const floorX = weight * floor.floorXWall + (1 - weight) * playerPos.x;
    const floorY = weight * floor.floorYWall + (1 - weight) * playerPos.y;
    let tx = ((textureSize.x * floorX) | 0) & (textureSize.x - 1);
    let ty = ((textureSize.y * floorY) | 0) & (textureSize.y - 1);
    const texOffset = (tx * textureSize.x + ty) * 4;
    const brightness = getBrightness(rowDistance);
    const offset = y * 4;
    stripe.data[offset] = floorTexture.data[texOffset] * brightness;
    stripe.data[offset + 1] = floorTexture.data[texOffset + 1] * brightness;
    stripe.data[offset + 2] = floorTexture.data[texOffset + 2] * brightness;
    stripe.data[offset + 3] = 255;
}


export function renderSprites(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    aspectRatio: number,
    sprites: Sprite[],
    zBuffer: number[],
    playerPos: Vec3,
    playerDir: Vec2,
    cameraPlane: Vec2,
) {
    for (const sprite of sprites) {
        sprite.relPos = sub2(sprite.pos, playerPos);
        sprite.relDist = sprite.relPos.x * sprite.relPos.x + sprite.relPos.y * sprite.relPos.y;
    }
    sprites.sort((a, b) => b.relDist - a.relDist);

    const invDet = 1 / (cameraPlane.x * playerDir.y - playerDir.x * cameraPlane.y);
    for (const sprite of sprites) {
        const transformX = invDet * (playerDir.y * sprite.relPos.x - playerDir.x * sprite.relPos.y);
        const transformY = invDet * (-cameraPlane.y * sprite.relPos.x + cameraPlane.x * sprite.relPos.y);
        const spriteScreenX = canvas.width / aspectRatio * (aspectRatio / 2 + transformX / transformY) | 0;
        const spriteHeight = Math.abs(canvas.height / transformY | 0);
        const drawStartY = (-spriteHeight / 2 + canvas.height / 2 - (sprite.pos.z - playerPos.z) * spriteHeight) | 0;
        const spriteWidth = Math.abs(canvas.height / transformY | 0);
        const drawStartX = Math.max(0, -spriteWidth / 2 + spriteScreenX) | 0;
        const drawEndX = Math.min(canvas.width - 1, spriteWidth / 2 + spriteScreenX) | 0;
        const texY = 0;
        const xMax = drawEndX - drawStartX;
        if (xMax < 1 || transformY <= 0) {
            continue;
        }
        const screenStartY = Math.max(0, Math.min(canvas.height - 1, drawStartY));
        const spriteYOffset = drawStartY < 0 ? drawStartY : 0;
        const yMax = Math.min(canvas.height, screenStartY + spriteHeight) - screenStartY;
        const brightness = getBrightness(transformY);
        const imageData = ctx.getImageData(screenStartY, drawStartX, yMax, xMax);
        for (let x = 0; x < xMax; x++) {
            const stripe = x + drawStartX;
            const texX = Math.floor(64 * (stripe - (-spriteWidth / 2 + spriteScreenX)) * textureSize.x / spriteWidth / 64);

            if (stripe > 0 && stripe < canvas.width) {
                for (let y = 0; y < yMax; y++) {
                    const zOffset = ((x + drawStartX) * canvas.height + y + screenStartY);
                    if (transformY >= zBuffer[zOffset]) {
                        continue;
                    }
                    const texYPos = texY + Math.floor((y - spriteYOffset) / spriteHeight * textureSize.y);
                    const offset = (x * imageData.width + y) * 4;
                    const texOffset = (texX * textureSize.x + texYPos) * 4;
                    if (sprite.texture.data[texOffset + 3]) {
                        imageData.data[offset] = sprite.texture.data[texOffset] * brightness;
                        imageData.data[offset + 1] = sprite.texture.data[texOffset + 1] * brightness;
                        imageData.data[offset + 2] = sprite.texture.data[texOffset + 2] * brightness;
                        imageData.data[offset + 3] = sprite.texture.data[texOffset + 3];
                    }
                }
            }
        }
        ctx.putImageData(imageData, screenStartY, drawStartX);
    }
}
