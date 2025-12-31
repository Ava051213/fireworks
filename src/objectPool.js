/**
 * 对象池管理模块
 * 预分配对象以减少垃圾回收压力，提升性能
 */

export class ObjectPool {
    constructor(createFn, initialSize = 100, maxBatchSize = 50) {
        this.createFn = createFn;
        this.pool = [];
        this.active = [];
        
        // 优化：分帧/分批初始化，避免主线程阻塞
        // 如果需要同步使用，则 initialSize 不应过大
        // 这里我们先填充一部分，后续按需扩展
        const startSize = Math.min(initialSize, maxBatchSize);
        
        for (let i = 0; i < startSize; i++) {
            this.pool.push(this.createFn());
        }
        
        // 剩余的稍后填充 (如果 initialSize 很大)
        if (initialSize > maxBatchSize) {
            setTimeout(() => {
                this.expandPool(initialSize - maxBatchSize);
            }, 100);
        }
    }

    expandPool(count) {
        const batch = 50;
        const remaining = count - batch;
        
        for (let i = 0; i < Math.min(count, batch); i++) {
            this.pool.push(this.createFn());
        }
        
        if (remaining > 0) {
            if (typeof requestIdleCallback !== 'undefined') {
                requestIdleCallback(() => this.expandPool(remaining));
            } else {
                setTimeout(() => this.expandPool(remaining), 50);
            }
        }
    }

    // 获取对象
    get(...args) {
        let obj;
        if (this.pool.length > 0) {
            obj = this.pool.pop();
        } else {
            obj = this.createFn();
        }
        
        if (obj.init) {
            obj.init(...args);
        }
        
        // 记录在活跃数组中的索引，方便 O(1) 回收
        obj._poolIndex = this.active.length;
        this.active.push(obj);
        return obj;
    }

    // 回收对象
    recycle(obj) {
        const index = obj._poolIndex;
        if (index !== undefined && index > -1 && index < this.active.length) {
            // 将最后一个活跃对象移动到当前位置，保持数组紧凑
            const lastObj = this.active[this.active.length - 1];
            this.active[index] = lastObj;
            lastObj._poolIndex = index;
            
            this.active.pop();
            obj._poolIndex = -1;
            
            if (obj.reset) {
                obj.reset();
            }
            
            this.pool.push(obj);
        }
    }

    // 获取活跃对象列表
    getActiveObjects() {
        return this.active;
    }
    
    // 获取池状态
    getStats() {
        return {
            total: this.pool.length + this.active.length,
            active: this.active.length,
            free: this.pool.length
        };
    }
}
