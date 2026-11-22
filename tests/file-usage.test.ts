import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { getFilePage } from '../model/db_method.js';
import { pool, query2 } from '../model/db.js';

// 查询测试结束后关闭连接池，避免测试断言通过但进程一直等待数据库连接。
after(() => new Promise<void>((resolve, reject) => {
    pool.end((error) => error ? reject(error) : resolve());
}));

test('file list marks referenced article and gallery images as used', async () => {
    const files = await getFilePage(1000, 1, -1);
    const articles = await query2<{ cover: string | null; content: string | null }[]>(
        'select cover, content from article');
    for (const file of files) {
        const referenced = articles.some((article) =>
            article.cover === file.url || Boolean(article.content?.includes(file.url)));
        if (referenced) assert.equal(file.in_use, 1, `file ${file.id} is in use`);
    }
});
