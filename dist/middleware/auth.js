import jwt from '../lib/jwt.js';
const auth = (req, res, next) => {
    // body 可能 undefined（GET / 未带 Content-Type 的请求），必须可选链
    const header = req.headers.authorization;
    const token = header?.toLowerCase().startsWith('bearer ')
        ? header.slice(7)
        : req.body?.token;
    const payload = typeof token === 'string' && token ? jwt.verifyToken(token) : null;
    if (!payload) {
        return res.send({ code: 300, msg: 'token 无效或已过期' }); // 记得 return
    }
    next();
};
export default auth;
//# sourceMappingURL=auth.js.map