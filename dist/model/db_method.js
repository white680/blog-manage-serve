/**
 * 数据库增删改查方法
 */
import * as db from './db.js';
// 查询数据库是否有注册用户 (返回的是一个数组,数组第一个元素中的.count就是注册用户的数量)
export const isRegister = () => {
    let _sql = 'select count(*) as count from users';
    return db.query2(_sql);
};
// 管理员注册
export const insertUser = (value) => {
    let _sql = 'insert into users set ?;';
    return db.query2(_sql, value);
};
// 验证管理员
// 管理员查找(用于登录)
export const signin = (name) => {
    let _sql = `select * from users where name = '${name}';`;
    return db.query2(_sql);
};
// 获取评论
export const getCommentPage = (pageSize, nowPage) => {
    let _sql = `select * from comment order by id desc limit ${(nowPage - 1) * pageSize},${pageSize};`;
    return db.query2(_sql);
};
// 获取评论总数
export const getCommentCount = (id) => {
    let _sql = ``;
    if (id == -1) {
        _sql = `select count(*) as count from comment;`;
    }
    else {
        _sql = `select count(*) as count from comment where article_id="${id}";`;
    }
    return db.query2(_sql);
};
// 评论变为已读
export const commentIsread = (id) => {
    let _sql = `update message set isread=1 where id=${id};`;
    return db.query2(_sql);
};
// 删除评论
export const deleteComment = (id) => {
    let _sql = `delete from comment where id=${id}`;
    return db.query2(_sql);
};
// 获取文章标题
export const getArticleTitle = (id) => {
    let _sql = `select title from article where id=${id};`;
    return db.query2(_sql);
};
// 获取私信
export const getMessagePage = (pageSize, nowPage) => {
    let _sql = `select * from message order by id desc limit ${(nowPage - 1) * pageSize},${pageSize};`;
    return db.query2(_sql);
};
// 获取私信总数
export const getMessageCount = () => {
    let _sql = `select count(*) as count from message;`;
    return db.query2(_sql);
};
// 获取私信未读数
export const getNoreadMessage = () => {
    let _sql = `select count(*) as count from message where isread=0;`;
    return db.query2(_sql);
};
// 私信变为已读
export const messageIsread = (id) => {
    let _sql = `update message set isread=1 where id=${id};`;
    return db.query2(_sql);
};
// 删除私信
export const deleteMessage = (id) => {
    let _sql = `delete from message where id=${id};`;
    return db.query2(_sql);
};
// 列表和总数复用同一套条件，保证分页总数与实际图库一致。
const articleFilter = (state, subsetId, serchTerm, classify) => {
    const conditions = ['classify = ?'];
    const values = [classify];
    if (serchTerm) {
        conditions.push('concat_ws(" ", title, introduce) like ?');
        values.push(`%${serchTerm}%`);
    }
    else if (typeof subsetId === 'number' && subsetId >= 0) {
        conditions.push('subset_id = ?');
        values.push(subsetId);
    }
    else if (typeof subsetId === 'string') {
        // 兼容原有的排除多个分组 id 的调用，并避免直接拼接用户输入到 SQL。
        const excluded = subsetId.split(',').map(Number).filter(Number.isInteger);
        if (excluded.length) {
            conditions.push('subset_id not in (?)');
            values.push(excluded);
        }
    }
    else if (state >= 0) {
        conditions.push('state = ?');
        values.push(state);
    }
    else if (subsetId === -2) {
        conditions.push('subset_id is null');
    }
    return { where: conditions.join(' and '), values };
};
// 获取当前页文章或图库；classify=0 为文章，classify=1 为图库。
export const getArticlePage = (pageSize, nowPage, state, subsetId, serchTerm, classify) => {
    const { where, values } = articleFilter(state, subsetId, serchTerm, classify);
    const size = Math.max(1, Math.min(100, Math.trunc(Number(pageSize)) || 10));
    const page = Math.max(1, Math.trunc(Number(nowPage)) || 1);
    return db.query2(`select * from article where ${where} order by id desc limit ?, ?;`, [...values, (page - 1) * size, size]);
};
// 使用与列表相同的筛选条件获取分页总数。
export const getArticleCount = (state, subsetId, serchTerm, classify) => {
    const { where, values } = articleFilter(state, subsetId, serchTerm, classify);
    return db.query2(`select count(*) as count from article where ${where};`, values);
};
// 修改文章发布状态（发布/撤回）
export const changeArticleState = (articleId, state) => {
    let _sql = `update article set state=${state} where id=${articleId};`;
    return db.query2(_sql);
};
// 文章删除
export const deleteArticle = (articleId, classify) => {
    // 图库调用时追加类型条件，防止错误 ID 删除普通文章。
    const where = classify === undefined ? 'id=?' : 'id=? and classify=?';
    return db.query2(`delete from article where ${where};`, classify === undefined ? [articleId] : [articleId, classify]);
};
// 新建文章点赞
export const addPraise = (value) => {
    let _sql = 'insert into praise set ?;';
    return db.query2(_sql, value);
};
// 获取文章点赞数
export const praiseCount = (article_id, user_id) => {
    let _sql = ``;
    if (user_id == -1) {
        _sql = `select count(*) as count from praise where article_id="${article_id}";`;
    }
    else {
        _sql = `select count(*) as count from praise where article_id="${article_id}" and user_id="${user_id}";`;
    }
    return db.query2(_sql);
};
// 获取分组
export const getSubset = (classify) => {
    let _sql = `select * from subset where classify=${classify};`;
    return db.query2(_sql);
};
// 新建分组
export const addSubset = (value) => {
    let _sql = 'insert into subset set ?;';
    return db.query2(_sql, value);
};
// 修改分组
export const updateSubset = (id, name) => {
    let _sql = `update subset set subset_name="${name}" where id="${id}";`;
    return db.query2(_sql);
};
// 删除分组
export const deleteSubset = (id) => {
    let _sql = `delete from subset where id="${id}";`;
    return db.query2(_sql);
};
// 获取标签
export const getLabel = () => {
    let _sql = `select * from label;`;
    return db.query2(_sql);
};
// 新建标签
export const addLabel = (value) => {
    let _sql = 'insert into label set ?;';
    return db.query2(_sql, value);
};
// 删除标签
export const deleteLabel = (id) => {
    let _sql = `delete from label where id="${id}";`;
    return db.query2(_sql);
};
// 以内容实际引用判定使用状态，避免独立标记在编辑或删除内容后失效。
const fileUsageSql = `(
    exists(select 1 from article a where a.cover=f.url or locate(f.url, coalesce(a.content, ''))>0)
    or exists(select 1 from diary d where locate(f.url, coalesce(d.picture, ''))>0 or locate(f.url, coalesce(d.content, ''))>0)
    or exists(select 1 from users u where locate(f.url, coalesce(u.imgurl, ''))>0)
    or exists(select 1 from comment c where locate(f.url, coalesce(c.content, ''))>0)
    or exists(select 1 from message m where locate(f.url, coalesce(m.content, ''))>0)
)`;
// 获取文件
export const getFilePage = (pageSize, nowPage, subsetId) => {
    let _sql = ``;
    if (subsetId > -1 && typeof subsetId == 'number') {
        _sql = `select f.*, ${fileUsageSql} as in_use from file f where f.subset_id=${subsetId} order by f.id desc limit ${(nowPage - 1) * pageSize},${pageSize};`;
    }
    else if (typeof subsetId == 'string') {
        _sql = `select f.*, ${fileUsageSql} as in_use from file f where f.subset_id not in ("${subsetId}") order by f.id desc limit ${(nowPage - 1) * pageSize},${pageSize};`;
    }
    else {
        _sql = `select f.*, ${fileUsageSql} as in_use from file f order by f.id desc limit ${(nowPage - 1) * pageSize},${pageSize};`;
    }
    return db.query2(_sql);
};
// 获取文件总数
export const getFileCount = (subsetId) => {
    let _sql = ``;
    if (subsetId > -1 && typeof subsetId == 'number') {
        _sql = `select count(*) as count from file where subset_id=${subsetId};`;
    }
    else if (typeof subsetId == 'string') {
        _sql = `select count(*) as count from file where subset_id not in ("${subsetId}");`;
    }
    else {
        _sql = `select count(*) as count from file;`;
    }
    return db.query2(_sql);
};
// 文件上传单张
export const uploadFile = (value) => {
    let _sql = 'insert into file set ?;';
    return db.query2(_sql, value);
};
export const getFilesForDeletion = (ids) => db.query2(`select f.id, f.url, ${fileUsageSql} as in_use from file f where f.id in (?)`, [ids]);
export const deleteUnusedFiles = (ids) => db.query2(`delete f from file f where f.id in (?) and not ${fileUsageSql}`, [ids]);
export const getResourceSubset = (id) => db.query2(`select id from subset where id=? and classify=2 limit 1`, [id]);
// 文件移动 这里的subsetId指的是所在的分组，第一个id是指这个文件的id
export const removeFile = (id, subsetId) => {
    let _sql = `update file set subset_id="${subsetId}" where id="${id}";`;
    return db.query2(_sql);
};
// 仅修改文件显示名称，不改变磁盘文件名和访问地址
export const renameFile = (id, fileName) => {
    return db.query2('update file set file_name = ? where id = ?;', [fileName, id]);
};
// 查询日记
export const getDiaryPage = (pageSize, nowPage, serchTerm) => {
    let _sql = ``;
    if (serchTerm) {
        _sql = `select * from diary where concat(title,content) like "%${serchTerm}%" order by id desc limit ${(nowPage - 1) * pageSize},${pageSize};`;
    }
    else {
        _sql = `select * from diary order by id desc limit ${(nowPage - 1) * pageSize},${pageSize};`;
    }
    return db.query2(_sql);
};
// 获取日记总数
export const getDiaryCount = (serchTerm) => {
    let _sql = ``;
    if (serchTerm) {
        _sql = `select count(*) as count from diary where concat(title,content) like "%${serchTerm}%";`;
    }
    else {
        _sql = `select count(*) as count from diary;`;
    }
    return db.query2(_sql);
};
// 新建日记createDiary
export const createDiary = (value) => {
    let _sql = 'insert into diary set ?;';
    return db.query2(_sql, value);
};
// 删除日记
export const deleteDiary = (id) => {
    let _sql = `delete from diary where id="${id}";`;
    return db.query2(_sql);
};
// 新建文章/图库
export const createArticle = (value) => {
    let _sql = 'insert into article set ?;';
    return db.query2(_sql, value);
};
// 获取文章/图库gainArticle
export const gainArticle = (id) => {
    let _sql = `select * from article where id=${id};`;
    return db.query2(_sql);
};
// 修改文章/图库updateArticle
export const updateArticle = (id, value, classify) => {
    // 图库编辑只更新 classify=1 的记录，保留文章编辑接口原有行为。
    const where = classify === undefined ? 'id=?' : 'id=? and classify=?';
    return db.query2(`update article set ? where ${where};`, classify === undefined ? [value, id] : [value, id, classify]);
};
//# sourceMappingURL=db_method.js.map