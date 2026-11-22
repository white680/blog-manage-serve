import assert from 'node:assert/strict';
import test from 'node:test';
import type { Express } from 'express';
import fileRoutes from '../routes/files.js';

test('POST /upload registers auth, parser and save handler', () => {
    let routeArgs: unknown[] = [];
    const app = {
        post: (...args: unknown[]) => {
            routeArgs = args;
        },
    } as unknown as Express;

    fileRoutes(app);

    assert.equal(routeArgs[0], '/upload');
    assert.equal(routeArgs.length, 4);
    assert.equal(typeof routeArgs[3], 'function');
});
