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

    return [canvas, ctx];
}

export function attachRenderFunction(
    canvas: HTMLCanvasElement,
    onUpdate: (dt: number) => void,
): () => void {
    const timings = Array(120);
    let timingPtr = 0;
    let active = true;
    let previousTime: number = 0;
    function update(time: number) {
        const dt = (time - previousTime) / 1000;
        previousTime = time;

        const start = performance.now();
        onUpdate(dt);

        timings[timingPtr++] = performance.now() - start;
        if (timingPtr >= timings.length) {
            const avg = timings.reduce((a, b) => a + b) / timings.length;
            console.log(`Average frame time: ${avg}ms (~${Math.floor(1000 / avg)} fps)`);
            timingPtr = 0;
        }

        if (document.activeElement === canvas) {
            requestAnimationFrame(update);
        } else {
            active = false;
        }
    }

    function repaint() {
        if (!active) {
            active = true;
            previousTime = +(document.timeline.currentTime ?? previousTime);
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

const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(src: string): Promise<HTMLImageElement> {
    let promise = imageCache.get(src);
    if (!promise) {
        const img = new Image();
        const basePath = document.getElementById('raycasting')?.getAttribute('data-basepath') ?? '';
        img.src = basePath + src;
        promise = new Promise((resolve, reject) => {
            img.onload = () => {
                resolve(img);
            };
            img.onerror = reject;
        });
    }
    return promise;
}

export async function loadTextureData(src: string): Promise<ImageData> {
    const img = await loadImage(src);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = img.width;
    canvas.height = img.height;
    context.drawImage(img, 0, 0);
    return context.getImageData(0, 0, canvas.width, canvas.height);
}
