import { query2 } from "./db.js";

type PublicArticleRow = {
    id: number;
    title: string;
    introduce: string | null;
    cover: string | null;
    label: string | null;
    subset_id: number | null;
    subset_name: string | null;
    views: number;
    praise: number;
    comment: number;
    moment: string;
};

// 三个筛选条件都可选，不传就不增加对应的SQL语句
type ArticleFilters = {
    subsetId?: number,
    label?: string,
    q?: string
}


// 列表和总数都共用这组条件
// classify=0是文章，classify=1是图库；默认值保留现有文章查询行为。
function buildArticleWhere(filters: ArticleFilters, classify: 0 | 1 = 0) {
    const conditions = ['a.classify = ?', 'a.state = 1'];
    const values: Array<number | string> = [classify];

    // 分组筛选与其他条件同时生效。
    if (filters.subsetId !== undefined) {
        conditions.push('a.subset_id = ?');
        values.push(filters.subsetId);
    }
    // 标签按逗号分隔后的完整名称匹配。
    const label = filters.label?.trim();
    if (label) {
        conditions.push('FIND_IN_SET(?, a.label) > 0');
        values.push(label);
    }
    // 关键词同时搜索标题和简介；空白关键词不参与筛选。
    const q = filters.q?.trim();
    if (q) {
        conditions.push('(a.title LIKE ? OR a.introduce LIKE ?)');
        values.push(`%${q}%`, `%${q}%`);
    }

    return {
        where: conditions.join(' AND '),
        values,
    };
}

// 返回符合全部筛选条件的已发布文章总数。
export async function PublicArticleCount(
    filters: ArticleFilters = {}
): Promise<number> {
    const { where, values } = buildArticleWhere(filters);

    const rows = await query2<Array<{ count: number }>>(
        `SELECT COUNT(*) AS count FROM article a WHERE ${where}`,
        values
    );

    return Number(rows[0]?.count ?? 0);
}

// 返回符合相同条件的当前页文章，不读取正文 content。
export function getPublishedArticlePage(
    page: number,
    pageSize: number,
    filters: ArticleFilters = {}
): Promise<PublicArticleRow[]> {
    const { where, values } = buildArticleWhere(filters);
    const offset = (page - 1) * pageSize;

    return query2<PublicArticleRow[]>(
        `SELECT
       a.id, a.title, a.introduce, a.cover, a.label,
       a.subset_id, s.subset_name, a.views, a.moment,
       (SELECT COUNT(*) FROM praise p WHERE p.article_id = a.id) AS praise,
       (SELECT COUNT(*) FROM comment c WHERE c.article_id = a.id) AS comment
     FROM article a
     LEFT JOIN subset s ON s.id = a.subset_id AND s.classify = 0
     WHERE ${where}
     ORDER BY a.id DESC
     LIMIT ?, ?`,
        [...values, offset, pageSize]
    );
}

// 详情比列表多返回正文：其他字段沿用文章列表的结构
type PublicArticleDetailRow = PublicArticleRow & {
    content: string | null;
}

// 根据ID查询一篇已发布的普通文章。
// 不存在、属于图库或尚未发布时，统一返回null
export async function getPublishedArticleById(
    id: number
): Promise<PublicArticleDetailRow | null> {
    const rows = await query2<PublicArticleDetailRow[]>(
        `SELECT
       a.id, a.title, a.introduce, a.content, a.cover, a.label,
       a.subset_id, s.subset_name, a.views, a.moment,
       (SELECT COUNT(*) FROM praise p WHERE p.article_id = a.id) AS praise,
       (SELECT COUNT(*) FROM comment c WHERE c.article_id = a.id) AS comment
     FROM article a
     LEFT JOIN subset s ON s.id = a.subset_id AND s.classify = 0
     WHERE a.id = ? AND a.classify = 0 AND a.state = 1
     LIMIT 1`,
        [id]
    );
    // SQL 查询结果是数组；按 ID 查询最多只有一条。
    return rows[0] ?? null;
}

type ArticleLink = {
    id: number;
    title: string;
}

type RelatedArticle = ArticleLink & {
    cover: string | null,
    moment: string
}

// 查询详情页附带的上一篇、下一篇和相关文章。
export async function getPublishedArticleExtras(
    id: number,
    subsetId: number | null
) {
    // ID 更小且最接近当前文章的，是上一篇。
    const previous = query2<ArticleLink[]>(
        `SELECT id, title FROM article
     WHERE classify = 0 AND state = 1 AND id < ?
     ORDER BY id DESC LIMIT 1`,
        [id]
    );

    // ID 更大且最接近当前文章的，是下一篇。
    const next = query2<ArticleLink[]>(
        `SELECT id, title FROM article
     WHERE classify = 0 AND state = 1 AND id > ?
     ORDER BY id ASC LIMIT 1`,
        [id]
    );

    // 没有分组时，不把其他“未分组”文章当作相关文章。
    const related: Promise<RelatedArticle[]> = subsetId === null
        ? Promise.resolve([])
        : query2<RelatedArticle[]>(
            `SELECT id, title, cover, moment FROM article
         WHERE classify = 0 AND state = 1
           AND subset_id = ? AND id <> ?
         ORDER BY id DESC LIMIT 3`,
            [subsetId, id]
        );

    // 三个互不依赖的查询同时执行。
    const [previousRows, nextRows, relatedRows] = await Promise.all([
        previous,
        next,
        related,
    ]);

    return {
        prev: previousRows[0] ?? null,
        next: nextRows[0] ?? null,
        related: relatedRows,
    };
}

// 返回符合筛选条件的已发布图库总数。
export async function getPublishedGalleryCount(
    filters: ArticleFilters = {}
): Promise<number> {
    const { where, values } = buildArticleWhere(filters, 1);

    const rows = await query2<Array<{ count: number }>>(
        `SELECT COUNT(*) AS count FROM article a WHERE ${where}`,
        values
    );
    return Number(rows[0]?.count ?? 0);
}

// 返回当前页图库；列表不读取存储图片数组的 content。
export function getPublishedGalleryPage(
    page: number,
    pageSize: number,
    filters: ArticleFilters = {}
): Promise<PublicArticleRow[]> {
    const { where, values } = buildArticleWhere(filters, 1);
    const offset = (page - 1) * pageSize;

    return query2<PublicArticleRow[]>(
        `SELECT
           a.id, a.title, a.introduce, a.cover, a.label,
           a.subset_id, s.subset_name, a.views, a.moment,
           (SELECT COUNT(*) FROM praise p WHERE p.article_id = a.id) AS praise,
           (SELECT COUNT(*) FROM comment c WHERE c.article_id = a.id) AS comment
         FROM article a
         LEFT JOIN subset s ON s.id = a.subset_id AND s.classify = 1
         WHERE ${where}
         ORDER BY a.id DESC
         LIMIT ?, ?`,
        [...values, offset, pageSize]
    );
}

// 图库详情与列表字段相同，但需要额外读取 content 中的图片数据。
type PublicGalleryDetailRow = PublicArticleRow & {
    content: string | null;
};

// 按 ID 查询一组已发布图库；文章、草稿或不存在的 ID 返回 null。
export async function getPublishedGalleryById(
    id: number
): Promise<PublicGalleryDetailRow | null> {
    const rows = await query2<PublicGalleryDetailRow[]>(
        `SELECT
           a.id, a.title, a.introduce, a.content, a.cover, a.label,
           a.subset_id, s.subset_name, a.views, a.moment,
           (SELECT COUNT(*) FROM praise p WHERE p.article_id = a.id) AS praise,
           (SELECT COUNT(*) FROM comment c WHERE c.article_id = a.id) AS comment
         FROM article a
         LEFT JOIN subset s ON s.id = a.subset_id AND s.classify = 1
         WHERE a.id = ? AND a.classify = 1 AND a.state = 1
         LIMIT 1`,
        [id]
    );

    // 最多一条；没有符合条件的图库时交给控制器返回 404。
    return rows[0] ?? null;
}


type PublicSubsetRow = {
    id: number;
    name: string;
    value: number;
};


// 查询文章或图库的全部分组，以及每组“已发布”的内容数量。
export function getPublishedSubsetList(
    classify: 0 | 1
): Promise<PublicSubsetRow[]> {
    return query2<PublicSubsetRow[]>(
        `SELECT
           s.id,
           s.subset_name AS name,
           COUNT(a.id) AS value
         FROM subset s
         LEFT JOIN article a
           ON a.subset_id = s.id
          AND a.classify = s.classify
          AND a.state = 1
         WHERE s.classify = ?
         GROUP BY s.id, s.subset_name
         ORDER BY s.id ASC`,
        [classify]
    );
}

type UsedLabelRow = {
    label: string;
};

// 只读取已发布普通文章实际填写的标签，不查询 label 词库表。
export function getUsedLabelRows(): Promise<UsedLabelRow[]> {
    return query2<UsedLabelRow[]>(
        `SELECT label
         FROM article
         WHERE classify = 0
           AND state = 1
           AND label IS NOT NULL
           AND TRIM(label) <> ''`
    );
}

type PublicMomentRow = {
    id: number;
    title: string;
    content: string;
    picture: string | null;
    weather_id: number | null;
    mood: number | null;
    moment: string;
};

// 按 ID 倒序读取当前页随笔。
export function getMomentPage(
    page: number,
    pageSize: number
): Promise<PublicMomentRow[]> {
    return query2<PublicMomentRow[]>(
        `SELECT id, title, content, picture, weather_id, mood, moment
         FROM diary
         ORDER BY id DESC
         LIMIT ?, ?`,
        [(page - 1) * pageSize, pageSize]
    );
}

// 查询随笔总数，供展示端计算分页。
export async function countMoments(): Promise<number> {
    const rows = await query2<Array<{ count: number }>>(
        'SELECT COUNT(*) AS count FROM diary'
    );
    return Number(rows[0]?.count ?? 0);
}

type SiteCounts = {
    article: number;
    gallery: number;
    diary: number;
};

// 一次查询取得已发布文章、已发布图库和全部随笔的数量。
export async function getSiteCounts(): Promise<SiteCounts> {
    const rows = await query2<SiteCounts[]>(
        `SELECT
           (SELECT COUNT(*) FROM article
            WHERE classify = 0 AND state = 1) AS article,
           (SELECT COUNT(*) FROM article
            WHERE classify = 1 AND state = 1) AS gallery,
           (SELECT COUNT(*) FROM diary) AS diary`
    );

    return {
        article: Number(rows[0]?.article ?? 0),
        gallery: Number(rows[0]?.gallery ?? 0),
        diary: Number(rows[0]?.diary ?? 0),
    };
}