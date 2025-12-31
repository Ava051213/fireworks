/**
 * 配置管理模块
 * 集中管理所有配置参数，支持动态更新
 */

const CONFIG = {
    // 物理参数
    gravity: 0.12,
    friction: 0.96,
    
    // 粒子参数
    particleCount: 220,
    particleSize: 3.2,
    
    // 烟花参数
    fireworkSpeed: 10,
    autoFireworkDelay: 1500,
    fadeSpeed: 0.015,
    
    // 视觉效果
    showTrails: true,
    trailAlpha: 0.25, // 从 0.45 降低到 0.25
    enableGlow: true,
    glowBlur: 15,
    
    // 性能优化
    usePool: true,
    maxParticles: 2600,
    poolSize: 100, // 初始池大小调小，避免启动时阻塞。后续会自动扩容。
    maxRockets: 8, // 最大同时存在的烟花数量
    minParticleCount: 50, // 自动降级时的最小粒子数
    
    // 性能监控
    enableStats: true,
    statsUpdateInterval: 500,
    
    // 界面设置
    showControlPanel: true,
    showStatsPanel: true,
    
    // 星空背景
    showStars: true,
    starCount: 150,

    // 场景元素
    skylineEnabled: true,
    skylineHeightRatio: 0.18,
    skylineColor: '#02020a',

    // 二次爆炸
    secondaryEnabled: true,
    secondaryProbability: 0.35,
    secondaryChildCount: 16,
    secondaryMaxGenerations: 2,

    // 目标帧率
    targetFps: 60
};

// 颜色主题配置
const COLOR_THEMES = {
    default: [
        '#ff1493', '#00ff00', '#00bfff', '#ffd700', 
        '#ff6b6b', '#4169e1', '#ff8c00', '#fff', 
        '#ff00ff', '#00ffff', '#ffec8b', '#ff4500'
    ],
    gold: ['#ffd700', '#ffeb3b', '#ffc107', '#ff9800', '#fff8e1'],
    cool: ['#00ffff', '#00bfff', '#1e90ff', '#4169e1', '#e0ffff'],
    neon: ['#ff00ff', '#00ffff', '#ffff00', '#ff0000', '#00ff00']
};

// 烟花形状配置
const FIREWORK_SHAPES = {
    circle: '圆形',
    heart: '心形',
    star: '星形',
    spiral: '螺旋',
    ring: '环形',
    random: '随机'
};

// 当前状态
export let currentShape = 'random';
export let currentTheme = 'default';

// 辅助函数
export function getColors() {
    return COLOR_THEMES[currentTheme] || COLOR_THEMES.default;
}

export function setCurrentTheme(theme) {
    currentTheme = theme;
}

export function setCurrentShape(shape) {
    currentShape = shape;
}

export { CONFIG, COLOR_THEMES, FIREWORK_SHAPES };
