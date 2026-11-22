import * as serve from '../controller/serve.js';
import auth from '../middleware/auth.js';
export default function registerRoutes(app) {
    app.get('/', (req, res) => {
        res.send('你好');
    });
    // 验证是否注册（免鉴权）
    app.post('/isRegister', serve.isRegister);
    // 管理员注册（免鉴权）
    app.post('/register', serve.insertUser);
    // 管理员登录（免鉴权）
    app.post('/signin', serve.signin);
    // 需要鉴权的接口：统一挂一次 auth 中间件，新增接口只需往数组里加路径
    app.use([
        '/comment',
        '/deleteComment',
        '/getMessage',
        '/getNoreadMessage',
        '/deleteMessage',
        '/article',
        '/changeArticleState',
        '/deleteArticle',
        '/articleState',
        '/subset',
        '/addSubset',
        '/updateSubset',
        '/deleteSubset',
        '/label',
        '/addLabel',
        '/deleteLabel',
        '/getFile',
        '/removeFile',
        '/renameFile',
        '/diary',
        '/deleteDiary',
        '/createArticle',
        '/gainArticle',
        '/updateArticle',
        '/createDiary',
        '/deleteFile',
        '/overview',
    ], auth);
    // 获取评论
    app.post('/comment', serve.getComment);
    // 删除评论
    app.post('/deleteComment', serve.deleteComment);
    // 获取私信
    app.post('/getMessage', serve.getMessage);
    // 获取私信未读数
    app.post('/getNoreadMessage', serve.getNoreadMessage);
    // 删除私信
    app.post('/deleteMessage', serve.deleteMessage);
    // 获取文章
    app.post('/article', serve.getArticle);
    // 修改文章发布状态
    app.post('/changeArticleState', serve.changeArticleState);
    // 删除文章
    app.post('/deleteArticle', serve.deleteArticle);
    // 文章不同状态条数
    app.post('/articleState', serve.articleState);
    // 查找分组
    app.post('/subset', serve.subset);
    // 新建分组
    app.post('/addSubset', serve.addSubset);
    // 修改分组名称updateSubset
    app.post('/updateSubset', serve.updateSubset);
    // 删除分组
    app.post('/deleteSubset', serve.deleteSubset);
    // 获取标签
    app.post('/label', serve.getLabel);
    // 新建标签
    app.post('/addLabel', serve.addLabel);
    // 删除标签
    app.post('/deleteLabel', serve.deleteLabel);
    // 获取文件getFile
    app.post('/getFile', serve.getFilePage);
    // 移动文件removeFile
    app.post('/removeFile', serve.removeFile);
    // 修改文件显示名称
    app.post('/renameFile', serve.renameFile);
    // 获取日记getDiaryPage
    app.post('/diary', serve.getDiaryPage);
    // 删除日记deleteDiary
    app.post('/deleteDiary', serve.deleteDiary);
    // 新建文章/图库 createArticle
    app.post('/createArticle', serve.createArticle);
    // 获取文章gainArticle
    app.post('/gainArticle', serve.gainArticle);
    // 修改文章/图库updateArticle
    app.post('/updateArticle', serve.updateArticle);
    // 新建日记createDiary
    app.post('/createDiary', serve.createDiary);
    // 删除文件deleteFile
    app.post('/deleteFile', serve.deleteFile);
    // 获取数据总览overview
    app.post('/overview', serve.overview);
}
//# sourceMappingURL=index.js.map