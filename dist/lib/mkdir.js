import fs from 'fs/promises';
import * as path from 'path';
// 删除文件
export async function deleteFile(url) {
    // 单个删除
    if (typeof url == 'string') {
        try {
            // 方式 A：推荐使用 rm，不仅能删文件，还能删目录，且支持配置项
            // await rm(`data/files/${url}`, { force: true });
            // force: true 表示如果文件不存在不会报错，类似于 rm -f
            // 方式 B：传统删除文件的 API
            await fs.unlink(`data/files/${url}`);
            console.log(`文件 ${url} 已成功删除`);
        }
        catch (error) {
            console.error(`删除文件失败: ${error.message}`);
        }
    }
    else {
        // 批量删除：并发发起，全部结束后再逐个检查结果（allSettled 不会因为某个失败而中断）
        // const results = await Promise.allSettled(url.map(ver => rm(`data/files/${ver}`, { force: true })));
        // results.forEach((result, i) => {
        //     if (result.status === 'rejected') {
        //         console.error(`删除文件 ${url[i]} 失败: ${(result.reason as Error).message}`);
        //     } else {
        //         console.log(`文件 ${url[i]} 已成功删除`);
        //     }
        // });
        await Promise.all(url.map(async function (ver) {
            try {
                await fs.unlink(`data/files/${ver}`);
            }
            catch (error) {
                console.error(`删除文件 ${ver} 失败: ${error.message}`);
            }
        }));
    }
}
// 计算文件夹大小
export async function getFileSize(directory) {
    let size = 0;
    async function calculateSize(dir) {
        for (const d of await fs.readdir(dir, { withFileTypes: true })) {
            const currentPath = path.join(dir, d.name);
            if (d.isDirectory()) {
                await calculateSize(currentPath);
            }
            else {
                size += (await fs.stat(currentPath)).size;
            }
        }
    }
    await calculateSize(directory);
    return size;
}
//# sourceMappingURL=mkdir.js.map