"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParallelBatchFlow = exports.BatchFlow = exports.Flow = exports.ParallelBatchNode = exports.BatchNode = exports.Node = exports.BaseNode = void 0;
class BaseNode {
    _params = {};
    _successors = new Map();
    async _exec(prepRes) { return await this.exec(prepRes); }
    async prep(shared) { return undefined; }
    async exec(prepRes) { return undefined; }
    async post(shared, prepRes, execRes) { return undefined; }
    async _run(shared) {
        const p = await this.prep(shared), e = await this._exec(p);
        return await this.post(shared, p, e);
    }
    async run(shared) {
        if (this._successors.size > 0)
            console.warn("Node won't run successors. Use Flow.");
        return await this._run(shared);
    }
    setParams(params) { this._params = params; return this; }
    next(node) { this.on("default", node); return node; }
    on(action, node) {
        if (this._successors.has(action))
            console.warn(`Overwriting successor for action '${action}'`);
        this._successors.set(action, node);
        return this;
    }
    getNextNode(action = "default") {
        const nextAction = action || 'default', next = this._successors.get(nextAction);
        if (!next && this._successors.size > 0)
            console.warn(`Flow ends: '${nextAction}' not found in [${Array.from(this._successors.keys())}]`);
        return next;
    }
    clone() {
        const clonedNode = Object.create(Object.getPrototypeOf(this));
        Object.assign(clonedNode, this);
        clonedNode._params = { ...this._params };
        clonedNode._successors = new Map(this._successors);
        return clonedNode;
    }
}
exports.BaseNode = BaseNode;
class Node extends BaseNode {
    maxRetries;
    wait;
    currentRetry = 0;
    constructor(maxRetries = 1, wait = 0) {
        super();
        this.maxRetries = maxRetries;
        this.wait = wait;
    }
    async execFallback(prepRes, error) { throw error; }
    async _exec(prepRes) {
        for (this.currentRetry = 0; this.currentRetry < this.maxRetries; this.currentRetry++) {
            try {
                return await this.exec(prepRes);
            }
            catch (e) {
                if (this.currentRetry === this.maxRetries - 1)
                    return await this.execFallback(prepRes, e);
                if (this.wait > 0)
                    await new Promise(resolve => setTimeout(resolve, this.wait * 1000));
            }
        }
        return undefined;
    }
}
exports.Node = Node;
class BatchNode extends Node {
    async _exec(items) {
        if (!items || !Array.isArray(items))
            return [];
        const results = [];
        for (const item of items)
            results.push(await super._exec(item));
        return results;
    }
}
exports.BatchNode = BatchNode;
class ParallelBatchNode extends Node {
    async _exec(items) {
        if (!items || !Array.isArray(items))
            return [];
        return Promise.all(items.map((item) => super._exec(item)));
    }
}
exports.ParallelBatchNode = ParallelBatchNode;
class Flow extends BaseNode {
    start;
    constructor(start) { super(); this.start = start; }
    async _orchestrate(shared, params) {
        let current = this.start.clone();
        const p = params || this._params;
        while (current) {
            current.setParams(p);
            const action = await current._run(shared);
            current = current.getNextNode(action);
            current = current?.clone();
        }
    }
    async _run(shared) {
        const pr = await this.prep(shared);
        await this._orchestrate(shared);
        return await this.post(shared, pr, undefined);
    }
    async exec(prepRes) { throw new Error("Flow can't exec."); }
}
exports.Flow = Flow;
class BatchFlow extends Flow {
    async _run(shared) {
        const batchParams = await this.prep(shared);
        for (const bp of batchParams) {
            const mergedParams = { ...this._params, ...bp };
            await this._orchestrate(shared, mergedParams);
        }
        return await this.post(shared, batchParams, undefined);
    }
    async prep(shared) { const empty = []; return empty; }
}
exports.BatchFlow = BatchFlow;
class ParallelBatchFlow extends BatchFlow {
    async _run(shared) {
        const batchParams = await this.prep(shared);
        await Promise.all(batchParams.map(bp => {
            const mergedParams = { ...this._params, ...bp };
            return this._orchestrate(shared, mergedParams);
        }));
        return await this.post(shared, batchParams, undefined);
    }
}
exports.ParallelBatchFlow = ParallelBatchFlow;
//# sourceMappingURL=index.js.map