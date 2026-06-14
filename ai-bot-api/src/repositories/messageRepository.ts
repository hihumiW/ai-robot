import { randomUUID } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { mysqlPool } from "../db/mysql.js";
import type { ChatRole } from "../types/chat.js";
import type { MessageDto } from "../types/conversation.js";

interface MessageRow extends RowDataPacket {
  id: string;
  conversation_id: string;
  role: ChatRole;
  content: string;
  sequence_no: number;
  created_at: Date;
  images: string | null; 
}

interface NextSequenceRow extends RowDataPacket {
  next_sequence_no: number;
}

const toMessageDto = (row: MessageRow): MessageDto => {
  // 第一步：把数据库消息行转换成前端更容易使用的 DTO。
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    sequenceNo: row.sequence_no,
    createdAt: row.created_at.toISOString(),
    images : row.images ?  JSON.parse(row.images) : void 0,
  };
};

export const createMessage = async (params: {
  conversationId: string;
  role: ChatRole;
  content: string;
  images?: string[];
}): Promise<MessageDto> => {
  // 第一步：查询当前会话的下一个消息序号，保证读取历史时可以稳定排序。
  const [sequenceRows] = await mysqlPool.execute<NextSequenceRow[]>(
    "SELECT COALESCE(MAX(sequence_no), 0) + 1 AS next_sequence_no FROM messages WHERE conversation_id = ?",
    [params.conversationId],
  );

  const sequenceNo = sequenceRows[0]?.next_sequence_no ?? 1;

  // 第二步：生成消息 ID，同样使用 32 位字符串。
  const messageId = randomUUID().replaceAll("-", "");
  const imagesJson = params.images ? JSON.stringify(params.images) : null;

  // 第三步：把消息写入 messages 表。
  await mysqlPool.execute(
    "INSERT INTO messages (id, conversation_id, role, content, sequence_no, images) VALUES (?, ?, ?, ?, ?, ?)",
    [messageId, params.conversationId, params.role, params.content, sequenceNo, imagesJson],
  );

  // 第四步：重新查询刚创建的消息，保证返回的是数据库真实数据。
  const message = await findMessageById(messageId);

  if (!message) {
    throw new Error("创建消息后没有查询到消息数据。");
  }

  return message;
};

export const findMessageById = async (
  messageId: string,
): Promise<MessageDto | null> => {
  // 第一步：按主键查询单条消息。
  const [rows] = await mysqlPool.execute<MessageRow[]>(
    "SELECT id, conversation_id, role, content, sequence_no, created_at, images FROM messages WHERE id = ? LIMIT 1",
    [messageId],
  );

  const row = rows[0];

  if (!row) {
    return null;
  }

  // 第二步：把数据库行转换成接口 DTO。
  return toMessageDto(row);
};

export const listMessagesByConversationId = async (
  conversationId: string,
): Promise<MessageDto[]> => {
  // 第一步：按 sequence_no 正序读取会话历史，确保消息顺序和写入顺序一致。
  const [rows] = await mysqlPool.execute<MessageRow[]>(
    "SELECT id, conversation_id, role, content, sequence_no, created_at, images FROM messages WHERE conversation_id = ? ORDER BY sequence_no ASC",
    [conversationId],
  );

  // 第二步：逐条转换成接口 DTO。
  return rows.map(toMessageDto);
};

// 根据ids删除messages
export const deleteMessageByIds = async (ids: string[]): Promise<boolean> => {
  if(!ids.length) return true;
  const placeholders = ids.map(i => `?`).join(',');
  const sql = `DELETE FROM messages WHERE id IN (${placeholders})`;
  const [result] = await mysqlPool.execute<ResultSetHeader>(sql, ids);

  return result.affectedRows > 0;
};
