import { getFile } from "@/lib/actions/file-actions";
import { saveAnalysisResults } from "../actions/analysis-actions";
import { analysisResults } from "../db/schema";


/**
 * 解析会议纪要文档，提取三重一大相关信息
 * 
 * @param fileId 文件ID
 * @param projectId 项目ID (用于保存到数据库)
 * @returns 文件解析状态和结果
 */
export async function analyzeMeetingDocument(fileId: string): Promise<typeof analysisResults.$inferSelect[]> {
  const items: typeof analysisResults.$inferSelect[] = [];

  // 从数据库获取真实文件信息
  let fileName = `document-${fileId}.docx`; // 设置默认值
  try {
    const fileInfo = await getFile(fileId);
    if (fileInfo?.filename) {
      fileName = fileInfo.filename;
    }
  } catch (error) {
    console.error(`获取文件[${fileId}]信息失败:`, error);
    // 已有默认文件名作为后备，不需额外处理
  }

  // 模拟API请求延迟
  await Promise.resolve(() => {
    // 模拟2-5秒的解析时间
    const delay = 2000 + Math.random() * 3000;

    setTimeout(() => {
      // 模拟95%的成功率
      if (Math.random() > 0.05) {
        // 随机生成1-3个三重一大事项
        const itemCount = Math.floor(Math.random() * 3) + 1;


        // 生成模拟数据
        for (let i = 0; i < itemCount; i++) {
          const eventTypes = ['重大决策', '重要干部任免', '重大项目', '大额资金'];
          const eventCategory = eventTypes[Math.floor(Math.random() * eventTypes.length)];

          // 创建ISO格式的日期字符串
          const date = new Date();
          date.setMonth(9 + i); // 10月 + i
          date.setDate(15 + i); // 15日 + i
          const isoDate = date.toISOString();

          const item: typeof analysisResults.$inferInsert = {
            fileId,
            itemIndex: i,
            meetingTime: new Date(isoDate) as Date, // 使用ISO日期格式
            meetingNumber: `企发[2023]${42 + i}号`,
            meetingTopic: `关于${eventCategory}${i + 1}号方案的议题`,
            meetingConclusion: `一致通过该${eventCategory}方案`,
            contentSummary: `讨论了${eventCategory}方案的实施细节和影响`,
            eventCategory,
            eventDetails: `${eventCategory}详情：涉及范围广泛，影响重大`,
            amountInvolved: eventCategory === '大额资金' ? `${(i + 1) * 1000}万元` : undefined,
            relatedDepartments: '财务部、工程部、法务部',
            relatedPersonnel: '张三、李四、王五',
            decisionBasis: '公司发展战略规划及市场调研报告',
            originalText: `会议讨论了${eventCategory}方案，与会人员一致通过...`
          }
          items.push(item);

          saveAnalysisResults(fileId, [item]);

          console.log(`文件 ${fileId} 的分析结果已成功保存到数据库`);
        }


        resolve();
      } else {
        // 模拟解析失败的情况
        resolve();
      }
    }, delay);
  });


  return items;
}
