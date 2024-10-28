export interface Vec2 {
    x: number;
    y: number;
}

export interface Vec3 {
    x: number;
    y: number;
    z: number;
}

export function set2(dest: Vec2, src: Vec2) {
    dest.x = src.x;
    dest.y = src.y;
}

export function add2(a: Vec2, b: Vec2): Vec2 {
    return {
        x: a.x + b.x,
        y: a.y + b.y,
    };
}

export function sub2(a: Vec2, b: Vec2): Vec2 {
    return {
        x: a.x - b.x,
        y: a.y - b.y,
    };
}

export function mul2(a: number, b: Vec2): Vec2 {
    return {
        x: b.x * a,
        y: b.y * a,
    };
}

export function initCanvas(id: string): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const canvas = document.getElementById(id) as HTMLCanvasElement;

    canvas.width = 320;
    canvas.height = 200;

    canvas.style.imageRendering = 'pixelated';
    if (canvas.parentElement) {
        const sizeMultiplier = Math.floor(canvas.parentElement.clientWidth * devicePixelRatio / canvas.width)
        canvas.style.width = `${canvas.width / devicePixelRatio * sizeMultiplier}px`;
        canvas.style.height = `${canvas.height / devicePixelRatio * sizeMultiplier}px`;
    }

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    return [canvas, ctx];
}

export function attachRenderFunction(
    canvas: HTMLCanvasElement,
    onUpdate: (dt: number) => void,
): () => void {
    let active = true;
    let previousTime: number = 0;
    function update(time: number) {
        const dt = (time - previousTime) / 1000;
        previousTime = time;

        onUpdate(dt);

        if (document.activeElement === canvas) {
            requestAnimationFrame(update);
        } else {
            active = false;
        }
    }

    function repaint() {
        if (!active) {
            active = true;
            requestAnimationFrame(update);
        }
    }
    canvas.addEventListener('focus', repaint);

    requestAnimationFrame(update);
    return repaint;
}

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const textureCache = new Map<string, Promise<ImageData>>();

export function loadTextureData(src: string): Promise<ImageData> {
    let texture = textureCache.get(src);
    if (!texture) {
        const img = new Image();
        img.src = src;
        texture = new Promise((resolve, reject) => {
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d')!;
                canvas.width = img.width;
                canvas.height = img.height;
                //context.transform(0, 1, 1, 0, 0, 0);
                context.drawImage(img, 0, 0);
                resolve(context.getImageData(0, 0, canvas.width, canvas.height));
            };
            img.onerror = reject;
        });
    }
    return texture;
}
