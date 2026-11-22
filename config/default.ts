const config = {
  port: 3000,
  // 入库时间使用的时区，避免服务器部署在 UTC 时与前端(+08:00)不一致
  timeZone: 'Asia/Shanghai',
  database:{ //连接数据库
    HOST:"localhost",
    USER:"root",
    PASSWORD:"123456",
    DB:"white_blog",
  }
};

export default config;