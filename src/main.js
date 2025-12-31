import { random } from './utils.js';
import { CONFIG, COLOR_THEMES, FIREWORK_SHAPES, setCurrentTheme, setCurrentShape } from './config.js';

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const fpsElement = document.getElementById('fps');
    
    // 为保证兼容性，默认使用主线程模式
    initMainThreadMode(canvas, fpsElement).catch(e => {
        console.error('Main thread init failed:', e);
    });
});

// 全局错误捕获
window.addEventListener('error', (e) => {
    console.error('Global Error:', e.message, e.filename, e.lineno);
});

function initWorkerMode(canvas, fpsElement) {
    console.log('Starting in Worker Mode (OffscreenCanvas)...');
    
    // 转移 Canvas 控制权
    const offscreen = canvas.transferControlToOffscreen();
    const worker = new Worker('src/worker.js', { type: 'module' });

    // 初始化 Worker
    worker.postMessage({
        type: 'init',
        payload: {
            canvas: offscreen,
            width: window.innerWidth,
            height: window.innerHeight
        }
    }, [offscreen]);

    // 监听 Worker 消息
    worker.onmessage = (e) => {
        const { type, payload } = e.data;
        if (type === 'fps') {
            fpsElement.innerText = payload;
        } else if (type === 'error') {
            console.error('Worker Error:', payload);
        }
    };

    // 监听 Worker 错误
    worker.onerror = (e) => {
        console.error('Worker Script Error:', e.message, e.filename, e.lineno);
    };

    // 事件转发：Resize
    window.addEventListener('resize', () => {
        worker.postMessage({
            type: 'resize',
            payload: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        });
    });

    // 事件转发：Click / Touch
    function emitFireworkFromEvent(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        console.log('Canvas click/touch -> send to worker:', x, y);
        worker.postMessage({
            type: 'click',
            payload: { x, y }
        });
    }

    canvas.addEventListener('click', (e) => {
        emitFireworkFromEvent(e.clientX, e.clientY);
    });

    canvas.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        if (!touch) return;
        emitFireworkFromEvent(touch.clientX, touch.clientY);
    });

    // 自动发射逻辑 (在主线程控制节奏，发送指令给 Worker)
    function autoFire() {
        // 即使页面隐藏，也继续递归调用 setTimeout，只是不执行发射逻辑
        // 这样可以保证切回页面时自动发射能立即恢复
        if (!document.hidden) {
            const x = random(window.innerWidth * 0.1, window.innerWidth * 0.9);
            const y = random(window.innerHeight * 0.1, window.innerHeight * 0.5);
            
            worker.postMessage({
                type: 'click',
                payload: { x, y }
            });
        }
        
        // 发射间隔更随机，同时允许更快的发射上限
        setTimeout(autoFire, random(CONFIG.autoFireworkDelay * 0.2, CONFIG.autoFireworkDelay * 1.8));
    }
    setTimeout(autoFire, 1000);

    // 快捷键控制
    initControls((type, value) => {
        worker.postMessage({
            type: type,
            payload: value
        });
    });
}

async function initMainThreadMode(canvas, fpsElement) {
    console.log('Starting in Main Thread Mode...');
    
    // 动态导入 Renderer，避免在 Worker 模式下加载无用代码
    const { Renderer } = await import('./renderer.js');

    const renderer = new Renderer(canvas, window.innerWidth, window.innerHeight, (fps) => {
        fpsElement.innerText = fps;
    });
    
    renderer.start();
    
    window.addEventListener('resize', () => {
        renderer.resize(window.innerWidth, window.innerHeight);
    });
    
    function emitFireworkFromEvent(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        console.log('Canvas click/touch -> addFirework:', x, y);
        renderer.addFirework(x, y);
    }

    canvas.addEventListener('click', (e) => {
        emitFireworkFromEvent(e.clientX, e.clientY);
    });

    canvas.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        if (!touch) return;
        emitFireworkFromEvent(touch.clientX, touch.clientY);
    });

    function autoFire() {
        // 即使页面隐藏，也继续递归调用 setTimeout，只是不执行发射逻辑
        if (!document.hidden) {
            const x = random(canvas.width * 0.1, canvas.width * 0.9);
            const y = random(canvas.height * 0.1, canvas.height * 0.5);
            renderer.addFirework(x, y);
        }
        // 发射间隔更随机，同时允许更快的发射上限
        setTimeout(autoFire, random(CONFIG.autoFireworkDelay * 0.2, CONFIG.autoFireworkDelay * 1.8));
    }
    setTimeout(autoFire, 1000);

    // 快捷键控制
    initControls((type, value) => {
        if (type === 'setTheme') setCurrentTheme(value.theme);
        if (type === 'setShape') setCurrentShape(value.shape);
    });
}

function initControls(callback) {
    const themes = Object.keys(COLOR_THEMES);
    let themeIndex = 0;
    
    window.addEventListener('keydown', (e) => {
        // 空格键切换主题
        if (e.code === 'Space') {
            themeIndex = (themeIndex + 1) % themes.length;
            const theme = themes[themeIndex];
            callback('setTheme', { theme });
            console.log('Switched to theme:', theme);
        }
        
        // 数字键切换形状
        if (e.key >= '1' && e.key <= '6') {
            const shapes = Object.keys(FIREWORK_SHAPES);
            if (shapes[e.key - 1]) {
                const shape = shapes[e.key - 1];
                callback('setShape', { shape });
                console.log('Switched to shape:', shape);
            }
        }
    });
}
