import { Particle } from './particle.js';
import { Rocket } from './rocket.js';
import { ObjectPool } from './objectPool.js';
import { drawStar, random } from './utils.js';
import { CONFIG, getColors } from './config.js';

/**
 * 渲染管理器
 * 负责画布渲染循环、对象管理和性能监控
 */
export class Renderer {
    constructor(canvas, width, height, onFpsUpdate) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false }); // 优化：关闭alpha通道，背景手动绘制
        this.width = width || 800;
        this.height = height || 600;
        this.onFpsUpdate = onFpsUpdate; // FPS 更新回调

        // 对象池
        this.particlePool = new ObjectPool(() => new Particle(), CONFIG.poolSize);
        this.rocketPool = new ObjectPool(() => new Rocket(), 20);
        
        this.rockets = [];
        this.lastTime = 0;
        this.frameCount = 0;
        this.fps = 0;
        this.initialParticleCount = CONFIG.particleCount;
        this.lowMode = false;
        this.baseShowStars = CONFIG.showStars;
        this.baseSecondaryEnabled = CONFIG.secondaryEnabled;
        this.baseEnableGlow = CONFIG.enableGlow;
        this.baseMaxRockets = CONFIG.maxRockets;
        
        // 物理环境：风力
        this.wind = 0;
        this.windTime = 0;

        this.stars = [];
        this.starTime = 0;
        this.buildings = [];
        this.offscreenCanvas = null;
        this.offscreenStarLayers = []; // 改为数组支持分层闪烁
        this.offscreenSkyline = null;

        this.resize(this.width, this.height);
        // Worker 模式下移除 DOM 事件监听
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
        
        // 初始化离屏画布
        this.initOffscreenCanvases();
        
        if (CONFIG.showStars) {
            this.initStars();
            this.renderStarsToOffscreen();
        }
        if (CONFIG.skylineEnabled) {
            this.initSkyline();
            this.renderSkylineToOffscreen();
        }
    }

    initOffscreenCanvases() {
        try {
            const layerCount = 6; // 增加到6层，使闪烁看起来更随机
            this.offscreenStarLayers = [];
            
            if (typeof OffscreenCanvas !== 'undefined') {
                for (let i = 0; i < layerCount; i++) {
                    this.offscreenStarLayers.push(new OffscreenCanvas(this.width, this.height));
                }
                this.offscreenSkyline = new OffscreenCanvas(this.width, this.height);
            } else if (typeof document !== 'undefined') {
                for (let i = 0; i < layerCount; i++) {
                    const canvas = document.createElement('canvas');
                    canvas.width = this.width;
                    canvas.height = this.height;
                    this.offscreenStarLayers.push(canvas);
                }
                this.offscreenSkyline = document.createElement('canvas');
                this.offscreenSkyline.width = this.width;
                this.offscreenSkyline.height = this.height;
            }
        } catch (e) {
            console.warn('OffscreenCanvas not supported, falling back to real-time rendering');
            this.offscreenStarLayers = [];
            this.offscreenSkyline = null;
        }
    }

    renderStarsToOffscreen() {
        if (this.offscreenStarLayers.length === 0 || this.stars.length === 0) return;
        
        const layerCount = this.offscreenStarLayers.length;
        const layerContexts = this.offscreenStarLayers.map(canvas => canvas.getContext('2d'));
        
        // 清空所有层
        layerContexts.forEach(ctx => ctx.clearRect(0, 0, this.width, this.height));
        
        for (let i = 0; i < this.stars.length; i++) {
            const s = this.stars[i];
            // 将星星分配到不同的层
            const layerIndex = i % layerCount;
            const ctx = layerContexts[layerIndex];
            
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = s.baseAlpha;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderSkylineToOffscreen() {
        if (!this.offscreenSkyline || this.buildings.length === 0) return;
        const ctx = this.offscreenSkyline.getContext('2d');
        ctx.clearRect(0, 0, this.width, this.height);
        
        const groundY = this.height;
        for (const b of this.buildings) {
            // 绘制建筑主体
            ctx.fillStyle = CONFIG.skylineColor || '#02020a';
            ctx.fillRect(b.x, groundY - b.height, b.width, b.height);
            
            // 绘制窗户灯光
            if (b.windows && b.windows.length > 0) {
                ctx.fillStyle = '#fdfbd3'; // 暖黄色灯光
                ctx.globalAlpha = 0.6;
                for (const w of b.windows) {
                    ctx.fillRect(b.x + w.rx, groundY - b.height + w.ry, w.rw, w.rh);
                }
                ctx.globalAlpha = 1.0;
            }
        }
    }

    // 发射烟花
    addFirework(targetX, targetY) {
        if (this.rockets.length >= CONFIG.maxRockets) {
            return;
        }
        const startX = this.width / 2 + random(-50, 50);
        const startY = this.height;
        
        // 传递 particlePool 以便火箭在上升时产生火花
        const rocket = this.rocketPool.get(startX, startY, targetX, targetY, this.particlePool);
        this.rockets.push(rocket);
    }

    update() {
        // 更新物理环境 (风力模拟)
        this.windTime += 0.01;
        // 风力随时间变化，模拟自然风（正弦波 + 随机扰动）
        this.wind = Math.sin(this.windTime) * 0.2 + (Math.random() - 0.5) * 0.05;

        // 更新火箭
        for (let i = this.rockets.length - 1; i >= 0; i--) {
            const rocket = this.rockets[i];
            const shouldExplode = rocket.update();
            
            if (shouldExplode) {
                rocket.explode(getColors(), this.particlePool);
                this.rocketPool.recycle(rocket);
                this.rockets.splice(i, 1);
            }
        }

        // 更新粒子
        const activeParticles = this.particlePool.getActiveObjects();
        for (let i = activeParticles.length - 1; i >= 0; i--) {
            const p = activeParticles[i];
            
            if (!p.isCore) {
                 p.vx += this.wind * 0.05;
            }

            p.update();

            if (
                CONFIG.secondaryEnabled &&
                p.isCore &&
                p.canSpawnSecondary &&
                p.alpha > 0.25 &&
                p.alpha < 0.75 &&
                !p.secondarySpawned &&
                (!p.generation || p.generation < CONFIG.secondaryMaxGenerations)
            ) {
                if (Math.random() < CONFIG.secondaryProbability) {
                    p.secondarySpawned = true;
                    const childCount = CONFIG.secondaryChildCount;
                    const baseSpeed = 3.2;
                    for (let j = 0; j < childCount; j++) {
                        const angle = random(0, Math.PI * 2);
                        const speed = baseSpeed * (0.7 + Math.random() * 0.6);
                        const child = this.particlePool.get(
                            p.x,
                            p.y,
                            p.color,
                            angle,
                            speed,
                            'circle',
                            false
                        );
                        if (child) {
                            child.generation = (p.generation || 1) + 1;
                            child.secondarySpawned = true;
                            child.canSpawnSecondary = false;
                            child.depth = p.depth || 1;
                        }
                    }
                }
            }

            if (p.isDead()) {
                this.particlePool.recycle(p);
            }
        }
    }

    initStars() {
        const count = CONFIG.starCount || 0;
        this.stars = [];
        for (let i = 0; i < count; i++) {
            this.stars.push({
                x: random(0, this.width),
                y: random(0, this.height * 0.7),
                radius: random(0.5, 1.5),
                baseAlpha: random(0.3, 0.8),
                twinkleSpeed: random(0.5, 1.5),
                phase: random(0, Math.PI * 2)
            });
        }
    }

    initSkyline() {
        const hRatio = CONFIG.skylineHeightRatio || 0.18;
        const baseHeight = this.height * hRatio;
        const minWidth = 30;
        const maxWidth = 70;
        this.buildings = [];
        let x = 0;
        while (x < this.width + maxWidth) {
            const w = random(minWidth, maxWidth);
            const heightFactor = random(0.4, 1);
            const bh = baseHeight * heightFactor;
            
            // 增加窗户数据
            const windows = [];
            if (bh > 20) {
                const rows = Math.floor(bh / 10);
                const cols = Math.floor(w / 8);
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        if (Math.random() < 0.3) { // 30% 的窗户开着灯
                            windows.push({
                                rx: c * 8 + 2,
                                ry: r * 10 + 2,
                                rw: 4,
                                rh: 6
                            });
                        }
                    }
                }
            }

            this.buildings.push({
                x,
                width: w,
                height: bh,
                windows
            });
            x += w * random(0.7, 1.1);
        }
    }

    drawSkyline() {
        if (!this.offscreenSkyline) {
            // 回退到实时绘制
            if (!this.buildings || this.buildings.length === 0) return;
            const ctx = this.ctx;
            ctx.save();
            ctx.fillStyle = CONFIG.skylineColor || '#02020a';
            ctx.globalAlpha = 1;
            const groundY = this.height;
            for (const b of this.buildings) {
                ctx.fillRect(b.x, groundY - b.height, b.width, b.height);
            }
            ctx.restore();
            return;
        }
        
        this.ctx.globalAlpha = 1;
        this.ctx.drawImage(this.offscreenSkyline, 0, 0);
    }

    drawStars() {
        if (this.offscreenStarLayers.length === 0) {
            // 回退到实时绘制
            if (!this.stars || this.stars.length === 0) return;
            const ctx = this.ctx;
            this.starTime += 0.005; // 降低基础频率
            for (const s of this.stars) {
                const t = this.starTime * s.twinkleSpeed + s.phase;
                const alpha = s.baseAlpha * (0.6 + 0.4 * Math.sin(t));
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            return;
        }

        // 分层预渲染闪烁逻辑：每层使用不同的相位和频率
        this.starTime += 0.005; // 降低基础频率
        const layerCount = this.offscreenStarLayers.length;
        
        for (let i = 0; i < layerCount; i++) {
            // 为每一层计算独特的透明度变化
            // 使用质数相关的频率偏移，减少周期重合感
            const phase = i * (Math.PI * 2 / layerCount) * 1.5;
            const freqMultiplier = 0.8 + (i * 0.3) % 1.5; 
            
            // 使用更加非线性的闪烁感
            let layerAlpha = 0.6 + 0.4 * Math.sin(this.starTime * freqMultiplier + phase);
            
            // 进一步拉开层次：有些层更暗，有些层闪烁幅度更大
            if (i % 2 === 0) layerAlpha *= 0.8;
            
            this.ctx.globalAlpha = layerAlpha;
            this.ctx.drawImage(this.offscreenStarLayers[i], 0, 0);
        }
        
        this.ctx.globalAlpha = 1;
    }

    draw() {
        // 绘制背景（带拖尾效果）
        this.ctx.globalCompositeOperation = 'source-over';
        
        // 增加氛围感：不仅是纯色背景，叠加一个地平线附近的光晕
        // 增加透明度以减轻“拖尾”感（从 0.2 提高到 0.35）
        this.ctx.fillStyle = `rgba(0, 4, 40, 0.35)`; 
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // 绘制地平线光晕（Atmospheric Glow）
        const gradient = this.ctx.createRadialGradient(
            this.width / 2, this.height, 0,
            this.width / 2, this.height, this.height * 0.8
        );
        gradient.addColorStop(0, 'rgba(10, 20, 60, 0.15)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        const activeParticles = this.particlePool.getActiveObjects();

        if (CONFIG.showStars) {
            this.drawStars();
        }
        if (CONFIG.skylineEnabled) {
            this.drawSkyline();
        }
        
        // 混合模式：让光效叠加更亮
        this.ctx.globalCompositeOperation = 'lighter';

        // 绘制火箭
        for (const rocket of this.rockets) {
            rocket.draw(this.ctx);
        }

        // 绘制粒子
        // 性能优化：根据 FPS 和粒子数量动态调整渲染策略
        const target = CONFIG.targetFps || 60;
        const isLowFps = this.fps > 0 && this.fps < target - 5;
        const isHighLoad = activeParticles.length > 1000;
        
        // 强制简化模式
        const forceSimple = isLowFps || isHighLoad;

        // 渲染步长：负载极高时跳过部分非核心粒子的渲染
        let renderStep = 1;
        if (activeParticles.length > 2000) renderStep = 4;
        else if (activeParticles.length > 1200) renderStep = 2;

        for (let i = 0; i < activeParticles.length; i++) {
            const p = activeParticles[i];
            
            // 降级逻辑：跳过部分非核心粒子
            if (!p.isCore && renderStep > 1 && (i % renderStep) !== 0) {
                continue;
            }

            // 如果处于强制简化模式，临时修改粒子属性（不推荐直接改对象，但为了性能可以忍受）
            const originalShape = p.shape;
            if (forceSimple && !p.isCore) p.shape = 'circle';
            
            p.draw(this.ctx);
            
            if (forceSimple && !p.isCore) p.shape = originalShape;
        }
        
        // 恢复默认混合模式
        this.ctx.globalCompositeOperation = 'source-over';
        
        // 可视化风力 (可选，调试用，或者作为 UI 一部分)
        // this.drawWindIndicator(); 
    }

    loop(timestamp) {
        // 计算FPS
        if (!this.lastTime) this.lastTime = timestamp;
        const elapsed = timestamp - this.lastTime;
        this.frameCount++;
        
        if (elapsed >= 1000) {
            const target = CONFIG.targetFps || 60;
            this.fps = Math.round(this.frameCount * 1000 / elapsed);
            
            // 通过回调更新 FPS
            if (this.onFpsUpdate) {
                this.onFpsUpdate(this.fps);
            }

            // 粒子数量自适应：围绕目标帧率动态调整粒子数量
            if (this.fps < target - 5 && CONFIG.particleCount > CONFIG.minParticleCount) {
                CONFIG.particleCount = Math.max(CONFIG.minParticleCount, CONFIG.particleCount - 10);
            } else if (this.fps > target + 5 && CONFIG.particleCount < this.initialParticleCount) {
                CONFIG.particleCount = Math.min(this.initialParticleCount, CONFIG.particleCount + 3);
            }

            // 视觉自适应降级：根据 FPS 开关重型效果（以目标帧率为中心）
            if (this.fps > target + 3 && this.lowMode) {
                this.lowMode = false;
                CONFIG.secondaryEnabled = this.baseSecondaryEnabled;
                CONFIG.enableGlow = this.baseEnableGlow;
                CONFIG.showStars = this.baseShowStars;
                CONFIG.maxRockets = this.baseMaxRockets;
            } else if (this.fps < target - 2 && !this.lowMode) {
                this.lowMode = true;
                CONFIG.secondaryEnabled = false;
                CONFIG.enableGlow = false;
                // CONFIG.showStars = false; // 保持星空显示
                CONFIG.maxRockets = Math.max(4, Math.floor(this.baseMaxRockets / 2));
                if (CONFIG.secondaryChildCount > 12) {
                    CONFIG.secondaryChildCount = 12;
                }
            }
            
            this.frameCount = 0;
            this.lastTime = timestamp;
        }

        this.update();
        this.draw();
        
        this.scheduleNextFrame();
    }

    start() {
        this.scheduleNextFrame();
    }

    scheduleNextFrame() {
        if (typeof requestAnimationFrame !== 'undefined') {
            requestAnimationFrame((t) => this.loop(t));
        } else {
            setTimeout(() => this.loop(performance.now()), 16);
        }
    }
}
