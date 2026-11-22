import assert from 'node:assert/strict';
import test from 'node:test';
import fileRoutes from '../routes/files.js';
test('POST /upload registers auth, parser and save handler', () => {
    let routeArgs = [];
    const app = {
        post: (...args) => {
            routeArgs = args;
        },
    };
    fileRoutes(app);
    assert.equal(routeArgs[0], '/upload');
    assert.equal(routeArgs.length, 4);
    assert.equal(typeof routeArgs[3], 'function');
});
//# sourceMappingURL=files.route.test.js.map