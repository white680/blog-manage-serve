import type { Request, Response } from "express";
import {
    PublicArticleCount, //文章总数
    getPublishedArticlePage, //当前页文章列表
    getPublishedArticleById, //文章详情
    getPublishedArticleExtras, //文章上下篇
    getPublishedGalleryCount, //图库总数
    getPublishedGalleryPage, 
    getPublishedGalleryById,
    getPublishedSubsetList,
    getUsedLabelRows,
    getMomentPage, //当前页随笔
    countMoments, //随笔总数
    getSiteCounts, //站点统计

} from "../model/public_method.js";

// 只接受非负整数；缺省时使用默认值。
// 这个函数是检查传入的参数是否合法，返回null则表示参数格式错误，例如abc、-1、1.5
function parseNonNegativeInt(
    value: unknown,
    defaultValue: number
): number | null {
    if (value === undefined) return defaultValue;
    if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) {
        return null;
    }

    const number = Number(value);
    return Number.isSafeInteger(number) ? number : null;
}

// GET /public/articles 的请求处理函数。也就是用于展示端的获取文章列表的接口请求函数
export const getArticles = async (
    req: Request,
    res: Response
): Promise<void> => {
    // 先校验URL参数：数组、对象等非字符串值不可以进入查询
    const rawPage = parseNonNegativeInt(req.query.page, 1);
    const rawPageSize = parseNonNegativeInt(req.query.pageSize, 10);
    const subsetId = req.query.subsetId === undefined ? undefined : parseNonNegativeInt(req.query.subsetId, 0)
    if (
        rawPage === null ||
        rawPageSize === null ||
        subsetId === null ||
        (req.query.label !== undefined && typeof req.query.label !== 'string') ||
        (req.query.q !== undefined && typeof req.query.q !== 'string')
    ) {
        res.status(400).send({ code: 400, msg: '参数无效' });
        return;
    }

    // 0 调整为 1，pageSize 最大为 50
    /**
     * page 是第几页：传 page=0 时按第 1 页查询。
     * pageSize 是每页多少条：传 pageSize=0 时按 1 条查询；传 pageSize=100 时最多按 50 条查询。
     */
    const page = Math.max(1, rawPage);
    const pageSize = Math.max(1, Math.min(50, rawPageSize));
    // 防止极大的页码使 offset 超出 JavaScript 安全整数范围。
    if (!Number.isSafeInteger((page - 1) * pageSize)) {
        res.status(400).send({ code: 400, msg: '参数无效' });
        return;
    }
    // 空白标签和关键词会在 model 的 buildArticleWhere 中被忽略。
    const filters = {
        subsetId,
        label: req.query.label as string | undefined,
        q: req.query.q as string | undefined,
    };
    try {
        // 两次查询使用同一组筛选条件：一个取总数，一个取当前页。
        const [count, rows] = await Promise.all([
            PublicArticleCount(filters), //总数
            getPublishedArticlePage(page, pageSize, filters),  //当前页
        ]);

        // 数据库中的 label 是逗号字符串；接口契约要求返回数组。
        const result = rows.map((row) => ({
            ...row,
            label: typeof row.label === 'string'
                ? row.label.split(',').map((name) => name.trim()).filter(Boolean)
                : [],
            views: Number(row.views ?? 0),
            praise: Number(row.praise ?? 0),
            comment: Number(row.comment ?? 0),
        }));

        res.send({
            code: 200,
            data: { count, page, pageSize, result },
        });
    } catch (error) {
        // 数据库错误不直接返回给访客，具体错误留在服务端日志。
        console.error('[public] getArticles', error);
        res.status(500).send({ code: 500, msg: '服务异常' });
    }

}

// GET /public/articles/:id：获取一篇已发布文章的详情。
export const getArticleDetail = async (
    req: Request,
    res: Response
): Promise<void> => {
    // 详情 ID 必须是大于 0 的安全整数；按接口约定，无效 ID 返回 404。
    const id = parseNonNegativeInt(req.params.id, 0);
    if (id === null || id <= 0) {
        res.status(404).send({ code: 404, msg: '内容不存在' });
        return;
    }

    try {
        // SQL 已限定 classify=0、state=1；图库、草稿和不存在的 ID 都得到 null。
        const article = await getPublishedArticleById(id);
        if (!article) {
            res.status(404).send({ code: 404, msg: '内容不存在' });
            return;
        }

        // 确认文章存在后，再查询上一篇、下一篇和相关文章。
        const extras = await getPublishedArticleExtras(
            article.id,
            article.subset_id
        );

        res.send({
            code: 200,
            data: {
                ...article,
                // 与列表接口保持一致：标签返回数组，计数返回数字。
                label: typeof article.label === 'string'
                    ? article.label.split(',').map((name) => name.trim()).filter(Boolean)
                    : [],
                views: Number(article.views ?? 0),
                praise: Number(article.praise ?? 0),
                comment: Number(article.comment ?? 0),
                // extras 包含 prev、next、related。
                ...extras,
            },
        });
    } catch (error) {
        console.error('[public] getArticleDetail', error);
        res.status(500).send({ code: 500, msg: '服务异常' });
    }
};

// GET /public/gallery：获取已发布图库的分页列表。
export const getGalleryList = async (
    req: Request,
    res: Response
): Promise<void> => {
    // 复用现有整数校验规则；未传时分别默认第 1 页、每页 10 条。
    const rawPage = parseNonNegativeInt(req.query.page, 1);
    const rawPageSize = parseNonNegativeInt(req.query.pageSize, 10);
    const subsetId = req.query.subsetId === undefined
        ? undefined
        : parseNonNegativeInt(req.query.subsetId, 0);
    const label = req.query.label;
    const q = req.query.q;

    // 参数格式错误时不查询数据库。
    if (
        rawPage === null ||
        rawPageSize === null ||
        subsetId === null ||
        (label !== undefined && typeof label !== 'string') ||
        (q !== undefined && typeof q !== 'string')
    ) {
        res.status(400).send({ code: 400, msg: '参数无效' });
        return;
    }

    // 与文章列表保持一致：0 按 1 处理，每页最多 50 条。
    const page = Math.max(1, rawPage);
    const pageSize = Math.max(1, Math.min(50, rawPageSize));
    if (!Number.isSafeInteger((page - 1) * pageSize)) {
        res.status(400).send({ code: 400, msg: '参数无效' });
        return;
    }

    const filters = { subsetId, label, q };

    try {
        // 总数与当前页使用同一组筛选条件。
        const [count, rows] = await Promise.all([
            getPublishedGalleryCount(filters),
            getPublishedGalleryPage(page, pageSize, filters),
        ]);

        // 将数据库中的逗号标签和计数字段转换为接口约定的类型。
        const result = rows.map((row) => ({
            ...row,
            label: typeof row.label === 'string'
                ? row.label.split(',').map((name) => name.trim()).filter(Boolean)
                : [],
            views: Number(row.views ?? 0),
            praise: Number(row.praise ?? 0),
            comment: Number(row.comment ?? 0),
        }));

        res.send({
            code: 200,
            data: { count, page, pageSize, result },
        });
    } catch (error) {
        console.error('[public] getGalleryList', error);
        res.status(500).send({ code: 500, msg: '服务异常' });
    }
};

// 将图库 content 转为图片地址数组，兼容旧的逗号分隔数据。
function parseGalleryImages(content: string | null): string[] {
    const raw = content?.trim();
    if (!raw) return [];

    if (raw.startsWith('[')) {
        try {
            const parsed: unknown = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                // 只保留非空字符串，避免 null 等值变成图片地址。
                return parsed
                    .filter((name): name is string => typeof name === 'string')
                    .map((name) => name.trim())
                    .filter(Boolean);
            }
        } catch {
            // 解析失败时继续尝试旧数据的逗号分隔格式。
        }
    }
    return raw.split(',').map((name) => name.trim()).filter(Boolean);
}

// GET /public/gallery/:id：获取一组已发布图库的详情。
export const getGalleryDetail = async (
    req: Request,
    res: Response
): Promise<void> => {
    // 无效 ID、文章 ID、草稿图库 ID 都应返回 404。
    const id = parseNonNegativeInt(req.params.id, 0);
    if (id === null || id <= 0) {
        res.status(404).send({ code: 404, msg: '内容不存在' });
        return;
    }

    try {
        const gallery = await getPublishedGalleryById(id);
        if (!gallery) {
            res.status(404).send({ code: 404, msg: '内容不存在' });
            return;
        }

        // 拆出原始 content，确保响应只包含解析后的 images。
        const { content, ...fields } = gallery;

        res.send({
            code: 200,
            data: {
                ...fields,
                label: typeof gallery.label === 'string'
                    ? gallery.label.split(',').map((name) => name.trim()).filter(Boolean)
                    : [],
                views: Number(gallery.views ?? 0),
                praise: Number(gallery.praise ?? 0),
                comment: Number(gallery.comment ?? 0),
                images: parseGalleryImages(content),
            },
        });
    } catch (error) {
        console.error('[public] getGalleryDetail', error);
        res.status(500).send({ code: 500, msg: '服务异常' });
    }
};


// GET /public/subsets：查询文章或图库分组及已发布数量。
export const getSubsets = async (
    req: Request,
    res: Response
): Promise<void> => {
    const rawClassify = req.query.classify;

    // 缺省按文章分组处理；只允许 0（文章）或 1（图库）。
    if (
        rawClassify !== undefined &&
        rawClassify !== '0' &&
        rawClassify !== '1'
    ) {
        res.status(400).send({ code: 400, msg: '参数无效' });
        return;
    }

    const classify: 0 | 1 = rawClassify === '1' ? 1 : 0;

    try {
        // count 是该类型已发布内容总数；list 是分组及各组数量。
        const [count, rows] = await Promise.all([
            classify === 0
                ? PublicArticleCount()
                : getPublishedGalleryCount(),
            getPublishedSubsetList(classify),
        ]);

        res.send({
            code: 200,
            data: {
                count,
                list: rows.map((row) => ({
                    id: row.id,
                    name: row.name,
                    value: Number(row.value ?? 0),
                })),
            },
        });
    } catch (error) {
        console.error('[public] getSubsets', error);
        res.status(500).send({ code: 500, msg: '服务异常' });
    }
};

// GET /public/labels：统计已发布文章实际使用的标签。
export const getLabels = async (
    _req: Request,
    res: Response
): Promise<void> => {
    try {
        const rows = await getUsedLabelRows();
        const counts = new Map<string, number>();

        for (const row of rows) {
            // 同一篇文章即使重复写了某个标签，也只计数一次。
            const names = new Set(
                row.label.split(',').map((name) => name.trim()).filter(Boolean)
            );

            for (const name of names) {
                counts.set(name, (counts.get(name) ?? 0) + 1);
            }
        }

        // 先按使用次数降序，再按标签名称升序。
        const list = Array.from(counts, ([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

        res.send({ code: 200, data: { list } });
    } catch (error) {
        console.error('[public] getLabels', error);
        res.status(500).send({ code: 500, msg: '服务异常' });
    }
};

// GET /public/moments：返回分页随笔。
export const getMoments = async (
    req: Request,
    res: Response
): Promise<void> => {
    // 与文章、图库列表使用同一套分页规则。
    const rawPage = parseNonNegativeInt(req.query.page, 1);
    const rawPageSize = parseNonNegativeInt(req.query.pageSize, 10);

    if (rawPage === null || rawPageSize === null) {
        res.status(400).send({ code: 400, msg: '参数无效' });
        return;
    }

    const page = Math.max(1, rawPage);
    const pageSize = Math.max(1, Math.min(50, rawPageSize));
    if (!Number.isSafeInteger((page - 1) * pageSize)) {
        res.status(400).send({ code: 400, msg: '参数无效' });
        return;
    }

    try {
        const [count, rows] = await Promise.all([
            countMoments(),
            getMomentPage(page, pageSize),
        ]);

        const result = rows.map((row) => ({
            ...row,
            // 数据库存逗号字符串；展示端接收图片文件名数组。
            picture: typeof row.picture === 'string'
                ? row.picture.split(',').map((name) => name.trim()).filter(Boolean)
                : [],
            // 按当前接口契约统一为数字，不查询空的 weather 表。
            weather_id: Number(row.weather_id ?? 0),
            mood: Number(row.mood ?? 0),
        }));

        res.send({
            code: 200,
            data: { count, page, pageSize, result },
        });
    } catch (error) {
        console.error('[public] getMoments', error);
        res.status(500).send({ code: 500, msg: '服务异常' });
    }
};

// GET /public/site：返回展示端首页需要的站点统计。
export const getSiteInfo = async (
    _req: Request,
    res: Response
): Promise<void> => {
    try {
        const [counts, labelRows] = await Promise.all([
            getSiteCounts(),
            getUsedLabelRows(),
        ]);
        // 与 /public/labels 口径一致：统计已发布文章使用的不同标签名。
        const labels = new Set<string>();
        for (const row of labelRows) {
            for (const name of row.label.split(',')) {
                const trimmed = name.trim();
                if (trimmed) labels.add(trimmed);
            }
        }

        res.send({
            code: 200,
            data: {
                ...counts,
                label: labels.size,
            },
        });
    } catch (error) {
        console.error('[public] getSiteInfo', error);
        res.status(500).send({ code: 500, msg: '服务异常' });
    }
};