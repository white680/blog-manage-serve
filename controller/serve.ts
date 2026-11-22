import type { Request, Response } from 'express';
import * as dbMethod from '../model/db_method.js';
import jwtToken from '../lib/jwt.js'
import * as mkdir from '../lib/mkdir.js'

// 是否注册
export const isRegister = async (req: Request, res: Response) => {
    // 查询数据库是否有注册用户
    await dbMethod.isRegister().then((result) => {
        let code: number = 401
        // 已注册
        if (result[0].count > 0) {
            code = 200
        }
        res.send({
            code: code,
            msg: code === 200 ? '已注册' : '未注册'
        });
    });
};
// 管理员注册
export const insertUser = async (req: Request, res: Response) => {
    let data = req.body;
    await dbMethod.insertUser(data).then(() => {
        res.send({
            code: 200
        });
    });
    // console.log(data);
    // res.send({
    //     code:200
    // })
};
// 管理员登录
export const signin = async (req: Request, res: Response) => {
    let data = req.body;
    await dbMethod.signin(data.name).then((result) => {
        // 这里的密码没有做特殊处理,后续需要进行加密处理
        if (result.length > 0 && data.psw == result[0].password) {
            let token = jwtToken.generateToken(data.name)
            let message = {
                id: result[0].id,
                name: data.name,
                token: token
            }
            res.send({
                code: 200,
                data: message
            });
        } else {
            // 用户不存在或者密码错误
            res.send({
                code: 400,
            })
        }
    });
};
// 获取评论
export const getComment = async (req: Request, res: Response) => {
    let data = req.body;
    let count = -1;
    await dbMethod.getCommentPage(data.pageSize, data.nowPage).then(async (result) => {
        if (data.count) {
            let c = await dbMethod.getCommentCount(-1);
            count = c[0].count;
        }
        if (result.length > 0) {
            // 获取对应的文章
            for (let i = 0; i < result.length; i++) {
                let getArticTitle = await dbMethod.getArticleTitle(result[i].article_id);
                // 如果有,才进行获取
                if (getArticTitle.length > 0) {
                    result[i].article = {
                        id: result[i].article_id,
                        title: getArticTitle[0].title
                    }
                } else {
                    // -1表示文章被删除了
                    result[i].article = {
                        id: -1,
                    }
                }
            }
        };
        res.send({
            code: 200,
            data: {
                count,
                result
            }
        })
    });
};

// 删除评论
export const deleteComment = async (req: Request, res: Response) => {
    let data = req.body;
    await dbMethod.deleteComment(data.id).then(() => {
        res.send({
            code: 200,
        })
    });
}


// 获取私信
export const getMessage = async (req: Request, res: Response) => {
    let data = req.body;
    let count = -1;
    await dbMethod.getMessagePage(data.pageSize, data.nowPage).then(async (result) => {
        if (data.count) {
            let c = await dbMethod.getMessageCount();
            count = c[0].count;
        }
        if (result.length > 0) {
            // 将私信变为已读
            for (let i = 0; i < result.length; i++) {
                await dbMethod.messageIsread(result[i].id)
            }
        }
        res.send({
            code: 200,
            data: {
                count,
                result
            }
        })
    });
};

// 获取私信未读数
export const getNoreadMessage = async (req: Request, res: Response) => {
    await dbMethod.getNoreadMessage().then(async (result) => {
        res.send({
            code: 200,
            data: {
                count: result[0].count
            }
        })
    });
};

// 删除私信
export const deleteMessage = async (req: Request, res: Response) => {
    let data = req.body;
    await dbMethod.deleteMessage(data.id).then(() => {
        res.send({
            code: 200,
        })
    });
}

// 获取文章总数
export const getArticle = async (req: Request, res: Response) => {
    let data = req.body;
    let count = -1;
    await dbMethod.getArticlePage(data.pageSize, data.nowPage, data.state, data.subsetId, data.serchTerm, data.classify).then(async (result) => {
        if (data.count) {
            let c = await dbMethod.getArticleCount(data.state, data.subsetId, data.serchTerm, data.classify);
            count = c[0].count;
        }
        if (result.length > 0) {
            for (let i = 0; i < result.length; i++) {
                // 点赞数
                let praise = await dbMethod.praiseCount(result[i].id, -1);  //点赞数
                let comment = await dbMethod.getCommentCount(result[i].id);
                result[i].praise = praise[0].count;
                result[i].comment = comment[0].count;
                if (result[i].label) {
                    result[i].label = result[i].label.split(",");
                }
            }
        };
        res.send({
            code: 200,
            data: {
                count,
                result
            }
        })
    });
};

// 修改文章发布状态
export const changeArticleState = async (req: Request, res: Response) => {
    let data = req.body;
    await dbMethod.changeArticleState(data.articleId, data.state).then(() => {
        res.send({
            code: 200,
        })
    });
}
// 文章删除
export const deleteArticle = async (req: Request, res: Response) => {
    let data = req.body;
    const id = Number(data.articleId);
    if (!Number.isSafeInteger(id) || id <= 0) {
        res.status(400).send({ code: 400, msg: '无效的内容 ID' });
        return;
    }
    const classify = data.classify === undefined ? undefined : Number(data.classify);
    if (classify !== undefined && classify !== 0 && classify !== 1) {
        res.status(400).send({ code: 400, msg: '无效的内容类型' });
        return;
    }
    await dbMethod.deleteArticle(id, classify).then((result) => {
        if (!result.affectedRows) {
            res.status(404).send({ code: 404, msg: '内容不存在' });
            return;
        }
        res.send({
            code: 200,
        })
    });
}
// 文章不同状态条数
export const articleState = async (req: Request, res: Response) => {
    // 分组栏复用此接口，通过 classify 分开统计文章与摄影图库。
    const classify = Number(req.body.classify) === 1 ? 1 : 0;
    // 已发布数量
    let Released = await dbMethod.getArticleCount(1, -1, "", classify)
    // 未发布数量
    let Unreleased = await dbMethod.getArticleCount(0, -1, "", classify)
    let message = [
        {
            id: 0,
            value: Unreleased[0].count
        },
        {
            id: 1,
            value: Released[0].count
        }
    ]
    res.send({
        code: 200,
        data: message,
    })
}


// 获取分组
export const subset = async (req: Request, res: Response) => {
    let data = req.body;
    await dbMethod.getSubset(data.classify).then(async (result) => {
        if (data.classify == 0 || data.classify == 1) {
            let count = await dbMethod.getArticleCount(-1, -1, "", data.classify);
            let list = [];
            if (result.length > 0) {
                for (let i = 0; i < result.length; i++) {
                    let value = await dbMethod.getArticleCount(-1, result[i].id, "", data.classify);
                    list[i] = {
                        id: result[i].id,
                        value: value[0].count,
                        name: result[i].subset_name,
                        moment: result[i].moment,
                    }
                }
            }
            res.send({
                code: 200,
                data: {
                    count: count[0].count,
                    list: list
                }
            })
        } else if (data.classify == 2) {
            let count = await dbMethod.getFileCount(-1);
            let list = [];
            if (result.length > 0) {
                for (let i = 0; i < result.length; i++) {
                    let value = await dbMethod.getFileCount(result[i].id);
                    list[i] = {
                        id: result[i].id,
                        value: value[0].count,
                        name: result[i].subset_name,
                        moment: result[i].moment,
                    }
                }
            }
            res.send({
                code: 200,
                data: {
                    count: count[0].count,
                    list: list
                }
            })
        }
    });
}

// 新建分组
export const addSubset = async (req: Request, res: Response) => {
    let data = req.body;
    await dbMethod.addSubset(data.value).then(() => {
        res.send({
            code: 200,
        })
    });
}

// 修改分组名称
export const updateSubset = async (req: Request, res: Response) => {
    let data = req.body;
    await dbMethod.updateSubset(data.subsetID, data.subsetName).then(() => {
        res.send({
            code: 200,
        })
    });
}

// 删除分组
export const deleteSubset = async (req: Request, res: Response) => {
    let data = req.body;
    await dbMethod.deleteSubset(data.subsetID).then(() => {
        res.send({
            code: 200,
        })
    });
}
// 获取标签
export const getLabel = async (req: Request, res: Response) => {
    await dbMethod.getLabel().then((result) => {
        res.send({
            code: 200,
            data: result
        })
    });
}

// 新建标签
export const addLabel = async (req: Request, res: Response) => {
    let data = req.body;
    await dbMethod.addLabel(data.value).then(() => {
        res.send({
            code: 200,

        })
    });
}

// 删除标签
export const deleteLabel = async (req: Request, res: Response) => {
    let data = req.body;
    await dbMethod.deleteLabel(data.labelId).then(() => {
        res.send({
            code: 200,
        })
    });
}

// 获取文件
export const getFilePage = async (req: Request, res: Response) => {
    let data = req.body;
    let count = -1;
    await dbMethod.getFilePage(data.pageSize, data.nowPage, data.subsetId).then(async (result) => {
        if (data.count) {
            let c = await dbMethod.getFileCount(data.subsetId);
            count = c[0].count;
        }
        res.send({
            code: 200,
            data: {
                count,
                result
            }
        })
    });
};

// 文件上传uploadFile
export const uploadFile = async (data: any[], res: Response) => {
    const result = await dbMethod.uploadFile(data);

    res.send({
        code: 200,
        data: {
            id: result.insertId,
            url: data[0].url,
            fileName: data[0].file_name,
            format: data[0].format,
            ...(data[0].subset_id == null ? {} : { subset_id: data[0].subset_id }),
        }
    })
}
// 删除文件deleteFile
export const deleteFile = async (req: Request, res: Response) => {
    const raw = req.body?.filesId;
    const submitted = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : [raw];
    const ids = submitted.map(Number);
    if (!ids.length || ids.length > 100 || ids.some((id) => !Number.isSafeInteger(id) || id <= 0) || new Set(ids).size !== ids.length) {
        res.status(400).send({ code: 400, msg: '文件 ID 无效' });
        return;
    }

    try {
        const files = await dbMethod.getFilesForDeletion(ids);
        if (files.length !== ids.length) {
            res.status(404).send({ code: 404, msg: '文件不存在，请刷新后重试' });
            return;
        }
        if (files.some((file) => file.in_use)) {
            res.status(409).send({ code: 409, msg: '使用中的图片不可删除' });
            return;
        }

        await dbMethod.deleteUnusedFiles(ids);
        // 再查一次，避免引用在删除前发生变化时误删磁盘文件。
        const remaining = new Set((await dbMethod.getFilesForDeletion(ids)).map((file) => file.id));
        const deleted = files.filter((file) => !remaining.has(file.id));
        await mkdir.deleteFile(deleted.map((file) => file.url));
        if (deleted.length !== ids.length) {
            res.status(409).send({ code: 409, msg: '部分图片已被使用，请刷新后重试', data: { deletedIds: deleted.map((file) => file.id) } });
            return;
        }
        res.send({ code: 200, data: { deletedIds: ids } });
    } catch {
        res.status(500).send({ code: 500, msg: '删除失败，请重试' });
    }
}
//移动文件 
export const removeFile = async (req: Request, res: Response) => {
    let data = req.body;
    await dbMethod.removeFile(data.fileId, data.subsetId).then(() => {
        res.send({
            code: 200,
        })
    });
}

// 只修改 file_name；url 是磁盘文件名，必须保持原值
export const renameFile = async (req: Request, res: Response) => {
    const id = req.body?.fileId;
    const rawName = req.body?.fileName;
    if (!Number.isSafeInteger(id) || id <= 0 || typeof rawName !== 'string') {
        return res.status(400).send({ code: 400, msg: '文件 ID 或名称无效' });
    }

    const fileName = rawName.trim();
    if (!fileName || fileName.length > 100) {
        return res.status(400).send({ code: 400, msg: '文件名称须为 1 到 100 个字符' });
    }

    try {
        const result = await dbMethod.renameFile(id, fileName);
        if (result.affectedRows === 0) {
            return res.status(404).send({ code: 404, msg: '文件不存在' });
        }
        return res.send({ code: 200, data: { id, fileName } });
    } catch {
        return res.status(500).send({ code: 500, msg: '修改文件名失败' });
    }
}

// 获取日记
export const getDiaryPage = async (req: Request, res: Response) => {
    let data = req.body;
    let count = -1;
    await dbMethod.getDiaryPage(data.pageSize, data.nowPage, data.serchTerm).then(async (result) => {
        if (data.count) {
            let c = await dbMethod.getDiaryCount(data.serchTerm);
            count = c[0].count;
        }
        if (result.length > 0) {
            for (let i = 0; i < result.length; i++) {
                if (result[i].picture) {
                    result[i].picture = result[i].picture.split(",");
                }
            }
        };
        res.send({
            code: 200,
            data: {
                count,
                result
            }
        })
    });
};
// 删除日记
export const deleteDiary = async (req: Request, res: Response) => {
    let data = req.body;
    await dbMethod.deleteDiary(data.diaryId).then(() => {
        res.send({
            code: 200,
        })
    });
}
// 新建文章/图库
export const createArticle = async (req: Request, res: Response) => {
    let data = req.body;
    await dbMethod.createArticle(data.value).then(() => {
        res.send({
            code: 200,
        })
    });
}

// 获取文章
export const gainArticle = async (req: Request, res: Response) => {
    let data = req.body;
    await dbMethod.gainArticle(data.id).then((result) => {
        res.send({
            code: 200,
            data: result
        })
    });
}
// 修改文章/图库updateArticle
export const updateArticle = async (req: Request, res: Response) => {
    let data = req.body;
    const id = Number(data.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
        res.status(400).send({ code: 400, msg: '无效的内容 ID' });
        return;
    }
    const classify = data.classify === undefined ? undefined : Number(data.classify);
    if (classify !== undefined && classify !== 0 && classify !== 1) {
        res.status(400).send({ code: 400, msg: '无效的内容类型' });
        return;
    }
    await dbMethod.updateArticle(id, data.value, classify).then((result) => {
        if (!result.affectedRows) {
            res.status(404).send({ code: 404, msg: '内容不存在' });
            return;
        }
        res.send({
            code: 200,
        })
    });
}
// 新建日记createDiary
export const createDiary = async (req: Request, res: Response) => {
    let data = req.body;
    await dbMethod.createDiary(data.value).then(() => {
        res.send({
            code: 200,
        })
    });
}

// 获取数据总览overview
export const overview = async (req: Request, res: Response) => {
    let article = await dbMethod.getArticleCount(-1, -1, "", 0);
    let gallery = await dbMethod.getArticleCount(-1, -1, "", 1);
    let diary = await dbMethod.getDiaryCount();
    let file = await mkdir.getFileSize('data/files');
    let size = "";
    if (file < (1024 * 1024)) {
        size = Math.round(file / 1024 * 1000) / 1000 + " KB";
    } else {
        size = Math.round(file / 1024 / 1024 * 1000) / 1000 + " MB";
    }
    let data = {
        article: article[0].count,
        gallery: gallery[0].count,
        diary: diary[0].count,
        file: size
    }
    res.send({
        code: 200,
        data: data
    })
}
