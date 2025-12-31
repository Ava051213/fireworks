import { drawStar, drawHeart, random, hexToRgb } from './utils.js';
import { CONFIG } from './config.js';
import { SHAPE_PATHS } from './shapes.js';

/**
 * 粒子类
 * 烟花爆炸后的微小发光体
 */
export class Particle {
    constructor() {
        this.reset();
    }

    init(x, y, color, angle, speed, shape = 'circle', isCore = false, scale = 1) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.shape = shape;
        this.isCore = isCore;
        this.scale = scale;
        
        // 解析颜色分量，用于视觉演变
        const rgb = hexToRgb(color) || { r: 255, g: 255, b: 255 };
        this.rgbStr = `${rgb.r}, ${rgb.g}, ${rgb.b}`;
        
        // 物理属性
        const velocityVariation = 0.8 + random(0, 0.4);
        this.vx = Math.cos(angle) * speed * velocityVariation;
        this.vy = Math.sin(angle) * speed * velocityVariation;
        
        // 生命周期
        this.alpha = 1;
        this.initialAlpha = 1;
        this.fadeSpeed = isCore ? random(0.005, 0.012) : random(0.01, 0.025);
        
        // 视觉特性：闪烁和偏移
        this.twinkleOffset = Math.random() * Math.PI * 2;
        this.twinkleSpeed = random(10, 20);
        
        // 环境参数
        this.gravity = CONFIG.gravity + random(0, 0.04);
        this.friction = CONFIG.friction + random(0, 0.02);
        
        // 视觉属性
        this.size = isCore ? random(5, 8) : random(3, 5);
        this.trail = [];
        this.trailLength = isCore ? (CONFIG.showTrails ? 8 : 0) : 0; // 从 14 缩短到 8
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.alpha = 0;
        this.generation = 0;
        this.secondarySpawned = false;
        this.canSpawnSecondary = false;
        if (this.trail) {
            this.trail.length = 0;
        } else {
            this.trail = [];
        }
    }

    update() {
        // 记录轨迹
        if (this.isCore && this.trailLength > 0) {
            this.trail.push({ x: this.x, y: this.y, alpha: this.alpha });
            if (this.trail.length > this.trailLength) this.trail.shift();
        }

        // 物理运动
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.vx *= this.friction;
        this.vy *= this.friction;
        
        // 渐隐
        this.alpha -= this.fadeSpeed;
    }

    draw(ctx) {
        // 屏幕裁剪
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        if (this.x < -20 || this.x > width + 20 || this.y < -20 || this.y > height + 20) return;

        const depth = this.depth || 1;
        let alpha = Math.max(this.alpha, 0) * depth;
        if (alpha <= 0.01) return;

        // 闪烁效果 (Twinkle)：在生命后期产生频闪感
        if (this.alpha < 0.5) {
            const twinkle = 0.7 + 0.3 * Math.sin(Date.now() * 0.01 * this.twinkleSpeed + this.twinkleOffset);
            alpha *= twinkle;
        }

        // 绘制拖尾 (仅 Core 粒子有拖尾)
        if (this.isCore && this.trail.length > 1 && CONFIG.showTrails) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                const tp = this.trail[i];
                ctx.lineTo(tp.x, tp.y);
            }
            ctx.globalAlpha = alpha * CONFIG.trailAlpha;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.size * depth * 0.5;
            ctx.stroke();
            ctx.restore();
        }

        const size = this.size * depth;
        ctx.globalAlpha = alpha;
        
        // 视觉演变：生命初期偏白（高亮），后期回归主色
        if (this.alpha > 0.8) {
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        } else {
            ctx.fillStyle = this.color;
        }

        // 性能优化：非核心粒子或较小的粒子使用矩形绘制，速度快很多
        const useSimpleRect = !this.isCore && (size < 3.5 || alpha < 0.4);

        if (useSimpleRect) {
            ctx.fillRect(this.x - size / 2, this.y - size / 2, size, size);
        } else {
            if (this.shape === 'circle') {
                ctx.beginPath();
                ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
                ctx.fill();
                
                // 为核心粒子增加一个小亮点
                if (this.isCore && this.alpha > 0.4) {
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, size * 0.4, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else {
                // 复杂形状仍然需要 save/restore/translate
                ctx.save();
                ctx.translate(this.x, this.y);
                switch (this.shape) {
                    case 'star':
                        if (SHAPE_PATHS.star) {
                            ctx.scale(size, size);
                            ctx.fill(SHAPE_PATHS.star);
                        } else {
                            drawStar(ctx, size, 5, 2.5);
                        }
                        break;
                    case 'heart':
                        if (SHAPE_PATHS.heart) {
                            ctx.scale(size, size);
                            ctx.fill(SHAPE_PATHS.heart);
                        } else {
                            drawHeart(ctx, size);
                        }
                        break;
                    case 'ring':
                        ctx.beginPath();
                        ctx.arc(0, 0, size * 1.2, 0, Math.PI * 2);
                        ctx.strokeStyle = this.color;
                        ctx.lineWidth = 1;
                        ctx.stroke();
                        break;
                }
                ctx.restore();
            }
        }
    }

    isDead() {
        return this.alpha <= 0;
    }
}
