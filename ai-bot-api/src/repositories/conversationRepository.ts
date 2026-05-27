import { randomUUID } from "node:crypto";
import { mysqlPool } from "../db/mysql.js";

import type { RowDataPacket } from "mysql2";
import type { ConversationDto } from "../types/conversation.js";
import { formatDateToString } from "../utils/date.js";

//定义PO ： 对应数据库 conversations 表的结构
// 同时它必须继承 RowDataPacket 才能作为mysqlPool 的返回结果
interface ConversationRow extends RowDataPacket {
  id: string;
  title: string | null;
  create_at: Date; // 对应mysql中的 datetime, mysql2会自动转换为JS的 Date对象
  update_at: Date;
}

// 将PO 转换为 DTO
const toConversationDto = (row: ConversationRow): ConversationDto => {
  return {
    id: row.id,
    title: row.title || '新会话',
    createAt: formatDateToString(row.create_at),
    updateAt: formatDateToString(row.update_at),
  };
};

// 根据ID 查找会话
export const findConversationById = async (
  id: string,
): Promise<ConversationDto | null> => {
  const sql = `SELECT * FROM conversations WHERE id = ? LIMIT 1`;

  // execute(sql, [参数...])， 需要注意的是， 即时就一个参数也要传递一个数组
  const [rows] = await mysqlPool.execute<ConversationRow[]>(sql, [id]);

  return rows.length ? toConversationDto(rows[0]) : null;
};


// 创建新的会话
export const createConversation  = async (title = '新会话') : Promise<ConversationDto> => {
    // 1. 生成新会话的 32位 UUID
    // 细节： randomUUID() 会生成36为的uuid, 需要去除其中的 -, 缩短为32为
    const conversationId = randomUUID().replaceAll('-', '');

    //编写sql
    //细节： 对于create_at字段来说， 可以不传， 数据库会自动生成。
    const sql = `INSERT INTO conversations (id, title) VALUES (?,?)`;

    //执行sql
    const result = await mysqlPool.execute(sql, [conversationId, title]);
    //对于DML语句。 mysql2 的 execute后通常会返回 [result, fields]；
    // 而这个result 是 ResultSetHeader， 包含：
    /**
     * {
        "fieldCount": 0,
        "affectedRows": 1,   // 受影响的行数，对于单条插入成功，它就是 1
        "insertId": 0,       // 自增主键的 ID。由于我们这里是用 UUID 做主键，不是自增，所以它是 0
        "info": "",
        "serverStatus": 2,
        "warningStatus": 0,
        "changedRows": 0     // 在 UPDATE 中表示实际发生数据改变的行数
        }
     */
    const conversation = await findConversationById(conversationId);
    if(!conversation){
        throw new Error('创建会话失败');
    }
    return conversation;
}


// 获取会话列表
export const listConversations = async() : Promise<ConversationDto[]> => {
    const sql = `SELECT * FROM conversations`;
    const [rows] = await mysqlPool.execute<ConversationRow[]>(sql);
    return rows.map(row => toConversationDto(row));
}