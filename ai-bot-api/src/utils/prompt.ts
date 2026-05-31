export const getChatSummaryTitlePrompt = (userContent : string , assistantContent : string) => {
    return `请为以下对话生成一个不超过 20 字的简短概括作为标题，直接输出概括，不要包含任何多余文字或标点符号。\n\n对话：\n用户：${userContent}\n助手：${assistantContent}`;
}

export const getSystemPrompt = () => {
    return  `你是一个专业的 AI 助手。请使用中文直接输出最终的回答，绝对不要包含任何形如 <think> 的思考、推理、草稿或内心独白过程。`;
}