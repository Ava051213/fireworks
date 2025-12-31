import { random, randomChoice } from './utils.js';
import { currentShape, FIREWORK_SHAPES, CONFIG } from './config.js';

/**
 * 火箭类
 * 负责发射阶段的动画
 */
export class Rocket {
    constructor() {
        this.reset();
    }

    init(startX, startY, targetX, targetY, pool) {
        this.x = startX;
        this.y = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.pool = pool; // 引用对象池以便爆炸时生成粒子
        
        // 随机生成烟花尺寸
        this.scale = random(0.75, 1.25);
        this.depth = Math.random() < 0.7 ? 1 : 0.7;

        const dx = targetX - startX;
        const dy = targetY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 速度计算
        const speed = CONFIG.fireworkSpeed + random(0, 2);
        this.vx = (dx / distance) * speed;
        this.vy = (dy / distance) * speed;
        
        this.distance = distance;
        this.traveled = 0;
        this.alive = true;
        this.size = 3 * this.scale; // 火箭弹头大小随尺寸变化
        this.color = '#ffd700'; // 金色尾迹
        
        this.trail = [];
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.traveled = 0;
        this.alive = false;
        this.trail = [];
        this.depth = 1;
    }

    update() {
        // 记录轨迹
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 5) this.trail.shift(); // 从 8 缩短到 5

        // 视觉优化：在上升过程中产生微小的火花粒子 (Sparkler)
        if (this.pool && Math.random() < 0.4) {
            const angle = Math.PI / 2 + random(-0.2, 0.2); // 向下喷射
            const speed = random(1, 3);
            this.pool.get(
                this.x, 
                this.y, 
                '#ffaa00', 
                angle, 
                speed, 
                'circle', 
                false, 
                0.3
            );
        }

        // 运动
        this.x += this.vx;
        this.y += this.vy;
        
        // 计算已飞行距离
        const dx = this.vx;
        const dy = this.vy;
        this.traveled += Math.sqrt(dx * dx + dy * dy);

        // 到达目标
        if (this.traveled >= this.distance) {
            this.alive = false;
            return true; // 触发爆炸
        }
        return false;
    }

    draw(ctx) {
        const alpha = this.depth || 1;
        
        // 绘制尾迹
        if (this.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.strokeStyle = '#fff8dc'; 
            ctx.lineWidth = 2 * alpha;
            ctx.globalAlpha = 0.4 * alpha;
            ctx.stroke();
        }

        // 绘制弹头
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        
        // 对于正在上升的火箭，少量的 shadowBlur 是可以接受的，因为数量很少（<8）
        if (CONFIG.enableGlow) {
            ctx.shadowBlur = 10 * alpha;
            ctx.shadowColor = this.color;
        }
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        
        if (CONFIG.enableGlow) {
            ctx.shadowBlur = 0;
        }
    }

    // 爆炸逻辑
    explode(colors, particlePool) {
        // 决定爆炸形态
        let shape = currentShape;
        if (shape === 'random') {
            const shapes = Object.keys(FIREWORK_SHAPES).filter(k => k !== 'random');
            shape = randomChoice(shapes);
        }

        const baseCount = CONFIG.particleCount + Math.floor(random(-20, 20));
        const count = Math.floor(baseCount * this.scale);
        const coreCount = Math.max(10, Math.floor(count * 0.15)); // 核心粒子数
        
        for (let i = 0; i < count; i++) {
            let angle, speed;
            
            // 根据形状计算角度和速度
            // 速度随 scale 缩放，决定了爆炸半径
            switch (shape) {
                case 'ring':
                    angle = (i / count) * Math.PI * 2;
                    speed = (8 + random(0, 2)) * this.scale * 0.9;
                    break;
                case 'star':
                    angle = (i / 5 | 0) * (Math.PI * 2 / 5) + (i % 5) * (Math.PI * 2 / 25);
                    speed = (9 + random(0, 3)) * this.scale * 0.9;
                    break;
                case 'heart':
                    const t = (i / count) * Math.PI * 2;
                    const r = 1; 
                    angle = random(0, Math.PI * 2);
                    speed = (5 + random(0, 7)) * this.scale * 0.9;
                    break;
                case 'spiral':
                    angle = i * 0.2;
                    speed = (3.5 + (i / count) * 7) * this.scale * 0.9;
                    break;
                default: // circle
                    angle = random(0, Math.PI * 2);
                    speed = random(4.5, 11) * this.scale * 0.9;
            }

            // 获取颜色
            const color = randomChoice(colors);
            
            const isCore = i < coreCount;
            const particle = particlePool.get(
                this.x, 
                this.y, 
                color, 
                angle, 
                speed, 
                shape === 'heart' ? 'heart' : 'circle', // 只有特定模式才用特殊形状绘制，否则用圆形
                isCore, // 是否为主干粒子
                this.scale // 传递缩放系数
            );

            if (particle) {
                particle.generation = 1;
                particle.secondarySpawned = false;
                particle.canSpawnSecondary = isCore && CONFIG.secondaryEnabled;
                particle.depth = this.depth;
            }
        }
    }
}
