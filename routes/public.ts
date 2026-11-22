import type { Express } from 'express';
import {
    getArticles,
    getArticleDetail,
    getGalleryList,
    getGalleryDetail,
    getSubsets,
    getLabels,
    getMoments,
    getSiteInfo,
} from '../controller/public.js';

// 集中注册展示端的匿名只读接口。
export default function registerPublicRoutes(app: Express): void {
    // 请求 GET /public/articles 时，交给控制器处理。
    // 文章列表，例如 GET /public/articles?page=1。
    app.get('/public/articles', getArticles);

    // 单篇详情，例如 GET /public/articles/28。
    // :id 会作为 req.params.id 传给控制器。
    app.get('/public/articles/:id', getArticleDetail);

    // 图库列表，例如 GET /public/gallery?page=1&pageSize=10。
    app.get('/public/gallery', getGalleryList);

    // 图库详情；:id 会传给控制器的 req.params.id。
    app.get('/public/gallery/:id', getGalleryDetail);

    // 分组列表；classify=0 查文章，classify=1 查图库。
    app.get('/public/subsets', getSubsets);

    // 返回已发布文章实际使用的标签及其文章数。
    app.get('/public/labels', getLabels);

    // 分页读取随笔；diary 表没有发布状态。
    app.get('/public/moments', getMoments);

    // 首页统计：已发布文章、已发布图库、随笔、已使用标签。
    app.get('/public/site', getSiteInfo);
}

