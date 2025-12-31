import { Renderer } from './renderer.js';
import { setCurrentTheme, setCurrentShape } from './config.js';

let renderer = null;

// 监听主线程消息
self.onmessage = function(e) {
    try {
        const { type, payload } = e.data;

        switch (type) {
            case 'init':
                init(payload.canvas, payload.width, payload.height);
                break;
            case 'resize':
                if (renderer) renderer.resize(payload.width, payload.height);
                break;
            case 'click':
                if (renderer) renderer.addFirework(payload.x, payload.y);
                break;
            case 'setTheme':
                setCurrentTheme(payload.theme);
                break;
            case 'setShape':
                setCurrentShape(payload.shape);
                break;
            case 'setConfig':
                // 处理通用配置更新（如果需要）
                break;
        }
    } catch (err) {
        // 发送错误回主线程
        self.postMessage({ 
            type: 'error', 
            payload: { message: err.message, stack: err.stack } 
        });
    }
};

function init(canvas, width, height) {
    renderer = new Renderer(canvas, width, height, (fps) => {
        // FPS 回调：发送回主线程
        self.postMessage({ type: 'fps', payload: fps });
    });
    
    // 启动渲染循环
    renderer.start();
}
