import { OpenAI } from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources';

// DeepSeek API 响应类型的扩展，增加 reasoning_content 字段
interface DeepSeekChatCompletionMessage {
    content: string | null;
    reasoning_content?: string | null;
    role: string;
}

interface DeepSeekChatCompletionChoice {
    index: number;
    message: DeepSeekChatCompletionMessage;
    finish_reason: string;
}

interface DeepSeekChatCompletion {
    id: string;
    choices: DeepSeekChatCompletionChoice[];
    // 其他字段同标准 ChatCompletion
}

// Initialize DeepSeek client
const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com',
});

/**
 * 将普通消息转换为 OpenAI 兼容的消息格式
 */
function toOpenAIMessages(messages: { role: string; content: string }[]): ChatCompletionMessageParam[] {
    return messages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
    }));
}

/**
 * Standard chat completion function using DeepSeek's chat model
 */
export async function chatCompletion(
    messages: { role: string; content: string }[],
    options: { temperature?: number; max_tokens?: number } = {}
) {
    try {
        const completion = await client.chat.completions.create({
            model: 'deepseek-chat', // DeepSeek-V3
            messages: toOpenAIMessages(messages),
            temperature: options.temperature || 0.7,
            max_tokens: options.max_tokens || 2000,
        });

        return {
            content: completion.choices[0].message.content,
            success: true,
        };
    } catch (error) {
        console.error('Error in chatCompletion:', error);
        return {
            content: null,
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Reasoning model function for more complex reasoning tasks using DeepSeek-R1
 */
export async function reasoningCompletion(
    messages: { role: string; content: string }[],
    options: { max_tokens?: number } = {}
) {
    try {
        // Clean messages to ensure no reasoning_content field is included
        const cleanedMessages = messages.map(({ role, content }) => ({ role, content }));

        // 使用 any 类型进行强制转换，因为 DeepSeek API 扩展了 OpenAI 的标准响应
        const completion = await client.chat.completions.create({
            model: 'deepseek-reasoner', // DeepSeek-R1
            messages: toOpenAIMessages(cleanedMessages),
            max_tokens: options.max_tokens || 4000,
        }) as unknown as DeepSeekChatCompletion;

        return {
            content: completion.choices[0].message.content,
            reasoningContent: completion.choices[0].message.reasoning_content,
            success: true,
        };
    } catch (error) {
        console.error('Error in reasoningCompletion:', error);
        return {
            content: null,
            reasoningContent: null,
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Function for extracting meeting minutes information using DeepSeek-R1
 */
export async function extractMeetingInfo(text: string) {
    const prompt = `
你是一个专业的审计助手，需要从三重一大会议纪要中提取关键信息。
提取以下字段：
- 会议时间
- 文号
- 会议议题
- 会议结论
- 内容摘要
- 事项类别（重大问题决策/重要干部任免/重大项目投资安排/大额资金使用）
- 事项详情
- 涉及资金数额（如有）
- 相关部门
- 相关人员
- 决策依据

请以JSON格式回答，如：
{
  "meetingDate": "会议时间",
  "documentNumber": "文号",
  "meetingTopic": "会议议题",
  "meetingConclusion": "会议结论",
  "contentSummary": "内容摘要",
  "eventType": "事项类别",
  "eventDetails": "事项详情",
  "involvedAmount": "涉及资金数额",
  "relatedDepartments": "相关部门",
  "relatedPersonnel": "相关人员",
  "decisionBasis": "决策依据"
}

以下是需要分析的会议纪要内容：
${text}
`;

    try {
        const result = await reasoningCompletion([
            { role: 'user', content: prompt }
        ]);

        if (!result.success) {
            throw new Error(result.error);
        }

        // Parse JSON from the response
        try {
            return {
                data: JSON.parse(result.content || '{}'),
                reasoningContent: result.reasoningContent,
                success: true,
            };
        } catch (parseError) {
            return {
                data: null,
                reasoningContent: result.reasoningContent,
                success: false,
                error: 'Failed to parse JSON response',
            };
        }
    } catch (error) {
        console.error('Error extracting meeting info:', error);
        return {
            data: null,
            reasoningContent: null,
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Function for extracting contract information using DeepSeek-R1
 */
export async function extractContractInfo(text: string) {
    const prompt = `
你是一个专业的合同分析助手，需要从合同中提取关键信息。
提取以下字段：
- 合同编号
- 签署日期
- 合同名称
- 甲方
- 乙方
- 合同金额（含税）
- 合同金额（不含税）
- 支付条款
- 履约期限
- 双方义务
- 验收标准
- 违约责任

请以JSON格式回答，如：
{
  "contractNumber": "合同编号",
  "signingDate": "签署日期",
  "contractName": "合同名称",
  "partyA": "甲方",
  "partyB": "乙方",
  "amountWithTax": "合同金额（含税）",
  "amountWithoutTax": "合同金额（不含税）",
  "paymentTerms": "支付条款",
  "performancePeriod": "履约期限",
  "obligations": "双方义务",
  "acceptanceCriteria": "验收标准",
  "liabilityForBreach": "违约责任"
}

以下是需要分析的合同内容：
${text}
`;

    try {
        const result = await reasoningCompletion([
            { role: 'user', content: prompt }
        ]);

        if (!result.success) {
            throw new Error(result.error);
        }

        // Parse JSON from the response
        try {
            return {
                data: JSON.parse(result.content || '{}'),
                reasoningContent: result.reasoningContent,
                success: true,
            };
        } catch (parseError) {
            return {
                data: null,
                reasoningContent: result.reasoningContent,
                success: false,
                error: 'Failed to parse JSON response',
            };
        }
    } catch (error) {
        console.error('Error extracting contract info:', error);
        return {
            data: null,
            reasoningContent: null,
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Function for Q&A with documents using DeepSeek-R1
 */
export async function documentQA(question: string, context: string) {
    const prompt = `
你是一个专业的审计助手，请基于以下文档内容，回答用户的问题。
如果文档中没有相关信息，请明确说明"基于提供的文档，我无法回答这个问题"。

文档内容：
${context}

用户问题：${question}
`;

    try {
        const result = await reasoningCompletion([
            { role: 'user', content: prompt }
        ]);

        return {
            answer: result.content,
            reasoningContent: result.reasoningContent,
            success: result.success,
            error: result.error,
        };
    } catch (error) {
        console.error('Error in document QA:', error);
        return {
            answer: null,
            reasoningContent: null,
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Function for checking compliance based on rules using DeepSeek-R1
 */
export async function checkCompliance(documentContent: string, rule: { name: string; description: string; config: any }) {
    const prompt = `
你是一个专业的合规审计助手，需要根据以下规则检查文档内容是否合规：

规则名称：${rule.name}
规则描述：${rule.description}
具体规则配置：${JSON.stringify(rule.config)}

请分析以下文档内容，判断是否符合上述规则。
如果合规，请回答"合规"并简要说明理由。
如果不合规，请回答"不合规"并详细说明问题所在和具体违规内容。

文档内容：
${documentContent}
`;

    try {
        const result = await reasoningCompletion([
            { role: 'user', content: prompt }
        ]);

        if (!result.success) {
            throw new Error(result.error);
        }

        // Analyze the response to determine compliance
        const content = result.content || '';
        const isCompliant = content.includes('合规') && !content.includes('不合规');

        return {
            passed: isCompliant,
            details: content,
            reasoningContent: result.reasoningContent,
            success: true,
        };
    } catch (error) {
        console.error('Error checking compliance:', error);
        return {
            passed: false,
            details: null,
            reasoningContent: null,
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
} 
