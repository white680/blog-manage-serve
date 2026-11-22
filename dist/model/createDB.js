/**
 * 数据库建表语句
 * 数组顺序即建表顺序，使用时按序依次执行
 */
const tableList = [
    // 用户表：用户名、邮箱、密码、头像
    `create table if not exists users(
     id INT NOT NULL AUTO_INCREMENT,
     name VARCHAR(100) NOT NULL COMMENT '用户名',
     mail VARCHAR(100) NOT NULL COMMENT '邮箱',
     password VARCHAR(100) NOT NULL COMMENT '密码',
     moment VARCHAR(100) NOT NULL COMMENT '时间',
     imgurl VARCHAR(100) COMMENT '头像地址',
     PRIMARY KEY ( id )
    );`,
    // 分组表：分类名称、类型（0 文章 / 1 图片 / 2 资源）
    `create table if not exists subset(
     id INT NOT NULL AUTO_INCREMENT,
     subset_name VARCHAR(100) NOT NULL COMMENT '分类名称',
     classify INT NOT NULL COMMENT '类型0文章，1图片，2资源',
     moment VARCHAR(100) NOT NULL COMMENT '时间',
     PRIMARY KEY ( id )
    );`,
    // 本地文件表：地址、文件名、格式、所属分类
    `create table if not exists file(
     id INT NOT NULL AUTO_INCREMENT,
     url VARCHAR(100) NOT NULL COMMENT '地址',
     file_name VARCHAR(100) NOT NULL COMMENT '名称',
     format VARCHAR(32) NOT NULL COMMENT '格式',
     subset_id INT COMMENT '所属分类',
     moment VARCHAR(100) NOT NULL COMMENT '时间',
     PRIMARY KEY ( id )
    );`,
    // 文章表：标题、分类、标签、简介、正文、封面、浏览量、状态
    `create table if not exists article(
     id INT NOT NULL AUTO_INCREMENT,
     title VARCHAR(200) NOT NULL COMMENT '标题',
     subset_id INT COMMENT '所属分类',
     classify INT NOT NULL COMMENT '类型0文章，1图片',
     label VARCHAR(200) COMMENT '标签',
     introduce VARCHAR(1000) COMMENT '简介',
     content VARCHAR(5000) COMMENT '内容',
     cover VARCHAR(100) COMMENT '封面地址',
     views INT DEFAULT 0 COMMENT '查看次数',
     state INT DEFAULT 0 COMMENT '文章状态',
     moment VARCHAR(100) NOT NULL COMMENT '时间',
     PRIMARY KEY ( id )
    );`,
    // 文章点赞表：点赞用户、用户类型、所属文章
    `create table if not exists praise(
     id INT NOT NULL AUTO_INCREMENT,
     user_id VARCHAR(100) NOT NULL COMMENT '用户',
     user_type INT NOT NULL COMMENT '查看次数',
     article_id INT  NOT NULL COMMENT '所属文章',
     moment VARCHAR(100) NOT NULL COMMENT '时间',
     PRIMARY KEY ( id )
    );`,
    // 文章评论表：评论人、所属文章、内容、举报次数、已读标记
    `create table if not exists comment(
     id INT NOT NULL AUTO_INCREMENT,
     user_id VARCHAR(100) NOT NULL COMMENT '用户',
     user_name VARCHAR(100) COMMENT '用户名称',
     article_id INT  NOT NULL COMMENT '所属文章',
     moment VARCHAR(100) NOT NULL COMMENT '时间',
     content VARCHAR(1000) NOT NULL COMMENT '内容',
     complaint INT DEFAULT 0 COMMENT '举报次数',
     isread INT DEFAULT 0 COMMENT '是否已读',
     PRIMARY KEY ( id )
    );`,
    // 标签表：标签名称
    `create table if not exists label(
     id INT NOT NULL AUTO_INCREMENT,
     label_name VARCHAR(100) NOT NULL COMMENT '名称',
     moment VARCHAR(100) NOT NULL COMMENT '时间',
     PRIMARY KEY ( id )
    );`,
    // 日记表：标题、内容、图片、天气、心情
    `create table if not exists diary(
     id INT NOT NULL AUTO_INCREMENT,
     title VARCHAR(200) NOT NULL COMMENT '标题',
     content VARCHAR(5000) NOT NULL COMMENT '内容',
     picture VARCHAR(500) COMMENT '图片地址',
     weather_id INT COMMENT '天气',
     mood INT DEFAULT 0 COMMENT '心情',
     moment VARCHAR(100) NOT NULL COMMENT '时间',
     PRIMARY KEY ( id )
    );`,
    // 天气表：天气名称与图标
    `create table if not exists weather(
     id INT NOT NULL AUTO_INCREMENT,
     weather_name VARCHAR(32) NOT NULL COMMENT '名称',
     icon VARCHAR(100) COMMENT '图标',
     PRIMARY KEY ( id )
    );`,
    // 私信表：收发用户、内容、已读标记
    `create table if not exists message(
     id INT NOT NULL AUTO_INCREMENT,
     user_id VARCHAR(100) NOT NULL COMMENT '用户',
     user_type INT NOT NULL COMMENT '用户类型',
     user_name VARCHAR(100) COMMENT '用户名称',
     moment VARCHAR(100) NOT NULL COMMENT '时间',
     content VARCHAR(1000) NOT NULL COMMENT '内容',
     isread INT DEFAULT 0 COMMENT '是否已读',
     PRIMARY KEY ( id )
    );`,
    // 埋点表：用户、位置、设备
    `create table if not exists record(
     id INT NOT NULL AUTO_INCREMENT,
     user_id VARCHAR(100) NOT NULL COMMENT '用户',
     user_type INT NOT NULL COMMENT '用户类型',
     position VARCHAR(100) COMMENT '位置',
     isread INT DEFAULT 0 COMMENT '设备',
     moment VARCHAR(100) NOT NULL COMMENT '时间',
     PRIMARY KEY ( id )
    );`,
];
export default tableList;
//# sourceMappingURL=createDB.js.map