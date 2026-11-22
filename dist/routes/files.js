import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { getResourceSubset } from "../model/db_method.js";
import auth from "../middleware/auth.js";
import * as serve from "../controller/serve.js";
// 源码在routes/，编译后在dist/routes：两种情况都定位到项目根目录。
const routeDir = import.meta.dirname;
const projectDir = path.basename(path.dirname(routeDir)) === "dist"
    ? path.resolve(routeDir, "../..")
    : path.resolve(routeDir, "..");
const uploadDir = path.join(projectDir, "data/files");
mkdirSync(uploadDir, { recursive: true });
const imageTypes = {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/webp": [".webp"]
};
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    // 此时req.file尚未生成，要使用回调函数file参数
    filename: (_req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();
        cb(null, `${randomUUID()}${extension}`);
    },
});
const uploadOne = multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024 }, //限制大小15mb
    fileFilter: (_req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();
        if (!imageTypes[file.mimetype]?.includes(extension)) {
            cb(new Error("只支持JPG、PNG、Webp图片"));
            return;
        }
        cb(null, true);
    },
}).single("file");
export default function fileRoutes(app) {
    app.post('/upload', auth, (req, res, next) => {
        uploadOne(req, res, (error) => {
            if (error) {
                res.status(400).send({
                    code: 400,
                    msg: error.message,
                });
                return;
            }
            next();
        });
    }, async (req, res) => {
        const savedFile = req.file;
        if (!savedFile) {
            res.status(400).send({
                code: 400,
                msg: "请选择图片"
            });
            return;
        }
        const subsetId = req.body.subsetId === undefined ? null : Number(req.body.subsetId);
        if (subsetId !== null) {
            try {
                if (!Number.isSafeInteger(subsetId) || !(await getResourceSubset(subsetId)).length) {
                    await unlink(savedFile.path).catch(() => { });
                    res.status(400).send({ code: 400, msg: "文件分组无效" });
                    return;
                }
            }
            catch {
                await unlink(savedFile.path).catch(() => { });
                res.status(500).send({ code: 500, msg: "文件分组校验失败" });
                return;
            }
        }
        const data = {
            url: savedFile.filename,
            file_name: path.parse(savedFile.originalname).name.slice(0, 100),
            format: path.extname(savedFile.originalname).slice(1).toLowerCase(),
            subset_id: subsetId,
            moment: new Date(),
        };
        try {
            // 现在使用的SQL语句使用的时insert...set ?
            await serve.uploadFile([data], res);
        }
        catch {
            // 写入失败的时候，移除刚保存的孤立文件。
            await unlink(savedFile.path).catch(() => { });
            res.status(500).send({
                code: 500,
                msg: "文件记录保存失败"
            });
        }
    });
}
//# sourceMappingURL=files.js.map