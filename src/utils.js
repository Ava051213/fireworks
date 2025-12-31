/**
 * 通用工具函数模块
 */

// 生成范围内的随机数
export function random(min, max) {
    return Math.random() * (max - min) + min;
}

// 从数组中随机获取一个元素
export function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// 计算两点间距离
export function getDistance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

// 颜色转换工具
export function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// 绘制五角星
export function drawStar(ctx, r, points, inset) {
    ctx.beginPath();
    ctx.moveTo(0, 0 - r);
    for (let i = 0; i < points * 2; i++) {
        const angle = Math.PI / points * i;
        const radius = i % 2 === 0 ? r : r / inset;
        ctx.lineTo(Math.sin(angle) * radius, -Math.cos(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();
}

// 绘制心形
export function drawHeart(ctx, size) {
    ctx.beginPath();
    const topCurveHeight = size * 0.3;
    ctx.moveTo(0, topCurveHeight);
    ctx.bezierCurveTo(0, 0, -size / 2, 0, -size / 2, topCurveHeight);
    ctx.bezierCurveTo(-size / 2, (size + topCurveHeight) / 2, 0, size, 0, size * 1.3);
    ctx.bezierCurveTo(0, size, size / 2, (size + topCurveHeight) / 2, size / 2, topCurveHeight);
    ctx.bezierCurveTo(size / 2, 0, 0, 0, 0, topCurveHeight);
    ctx.closePath();
    ctx.fill();
}
