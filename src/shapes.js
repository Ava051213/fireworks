/**
 * 形状路径缓存模块
 * 使用 Path2D 预编译复杂形状的绘图路径，避免每帧重复计算
 */

// 预编译的 Path2D 对象
export const SHAPE_PATHS = {
    star: null,
    heart: null
};

// 初始化路径
function initPaths() {
    // 1. 五角星路径 (归一化大小，绘制时通过 scale 调整)
    // 基础半径为 1
    const starPath = new Path2D();
    const r = 1;
    const inset = 2.5; // 内缩比例
    starPath.moveTo(0, 0 - r);
    for (let i = 0; i < 10; i++) {
        const angle = Math.PI / 5 * i;
        const radius = i % 2 === 0 ? r : r / inset;
        starPath.lineTo(Math.sin(angle) * radius, -Math.cos(angle) * radius);
    }
    starPath.closePath();
    SHAPE_PATHS.star = starPath;

    // 2. 心形路径 (归一化大小)
    // 基础尺寸为 1
    const heartPath = new Path2D();
    const size = 1;
    const topCurveHeight = size * 0.3;
    heartPath.moveTo(0, topCurveHeight);
    heartPath.bezierCurveTo(0, 0, -size / 2, 0, -size / 2, topCurveHeight);
    heartPath.bezierCurveTo(-size / 2, (size + topCurveHeight) / 2, 0, size, 0, size * 1.3);
    heartPath.bezierCurveTo(0, size, size / 2, (size + topCurveHeight) / 2, size / 2, topCurveHeight);
    heartPath.bezierCurveTo(size / 2, 0, 0, 0, 0, topCurveHeight);
    heartPath.closePath();
    SHAPE_PATHS.heart = heartPath;
}

// 立即初始化
initPaths();
