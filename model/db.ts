import mysql from 'mysql';
import config from '../config/default.js';
import tableList from './createDB.js';
import { formatMoment } from '../lib/date.js';

// 写入前统一 moment 字段：前端可能传 Date 对象或 ISO(UTC) 字符串，
// 统一成本地时间字符串，保证库里格式一致
const normalizeValues = (values: any): any => {
    if (Array.isArray(values)) {
        return values.map((item) => normalizeValues(item));
    }
    if (!values || typeof values !== 'object' || values instanceof Date) {
        return values;
    }
    if (!('moment' in values)) {
        return values;
    }
    return { ...values, moment: formatMoment(values.moment) };
};


// 数据库连接
const connection = mysql.createConnection({
    host: config.database.HOST,
    user: config.database.USER,
    password: config.database.PASSWORD,
});

// 直接连接（未指定 database，仅用于建库）
let query = <T = any>(sql: string, values: any[] = []): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
        connection.query(sql, values, (err, result) => {
            if (err) {
                reject(err)
            } else {
                resolve(result)
            }
        })
    })
}

//连接指定数据库
const pool = mysql.createPool({
    connectionLimit: 10,  //连接数量
    host: config.database.HOST,
    user: config.database.USER,
    password: config.database.PASSWORD,
    database: config.database.DB,
});

// 通过 pool.getconnection 获得连接
let query2 = <T = any>(sql: string, values: any[] = []): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
        pool.getConnection((err, connection) => {
            if (err) {
                reject(err)
            } else {
                connection.query(sql, normalizeValues(values), (err, rows) => {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(rows)
                    }
                    connection.release(); //释放该链接，把该链接放回池中，等待被其他sql使用
                    // connection.destroy(); //如果要关闭连接并将其从池中删除，请改用这个方法
                })
            }
        })
    })
}
// 创建数据库，库名取自 config，避免与配置不一致
let createDatabase = () => {
    return query(`CREATE DATABASE IF NOT EXISTS \`${config.database.DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`)
}

// 创建数据表，按 createDB.ts 的数组顺序依次执行
let createTables = async () => {
    for (const sql of tableList) {
        await query2(sql);
    }
}

// 初始化：先建库，再建表
let initDatabase = async () => {
    await createDatabase();
    await createTables();
}


export { connection, query, pool, query2, createDatabase, createTables, initDatabase };