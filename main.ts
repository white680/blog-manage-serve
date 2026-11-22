import path from 'node:path';
import express, { type Express, type Request, type Response } from 'express';
import config from './config/default.js';
import registerRoutes from './routes/index.js';
import filesRoutes from './routes/files.js'
import registerPublicRoutes from './routes/public.js';
import { initDatabase } from './model/db.js';
import cors from 'cors';
const app: Express = express();

// 加入静态文件
// 编译后位于 dist/，此时 data 在上一级目录
const rootDir =
  path.basename(import.meta.dirname) === 'dist' ? path.dirname(import.meta.dirname) : import.meta.dirname;

app.use(express.static(path.join(rootDir, 'data')));
// 设置跨域
app.use(cors({
  origin: 'http://localhost:5174',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  // 必须把前端实际会带的请求头全部列出来，否则预检会被浏览器拦截
  // （以后前端再加自定义头，这里也要同步加，或者直接删掉 allowedHeaders 让它回显请求头）
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'x-custom-header'],
  credentials: true,
  optionsSuccessStatus: 200
}));
// 解析前端数据
app.use(express.json());

// 注册展示端公共接口；不经过管理接口的鉴权中间件。
registerPublicRoutes(app);
// 引入路由
registerRoutes(app);
// 引入文件路由
filesRoutes(app)

// 建库并建表（失败则不启动服务）
try {
  await initDatabase();
  console.log('数据库初始化完成');
} catch (err) {
  console.error('数据库初始化失败：', err);
  process.exit(1);
}

app.listen(config.port, () => {
  console.log(`端口 ${config.port} 已经启动成功`);
});