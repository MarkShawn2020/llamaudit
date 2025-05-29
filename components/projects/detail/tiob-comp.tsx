import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { saveAs } from "file-saver";
import { Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useAtom } from "jotai";
import { tiobItemsAtom, projectTiobItemsAtomFamily } from "@/components/projects/detail/project-atoms";

export interface TIOBInterface {
  categoryType: string;
  details: string;
  amount: string;
  departments: string;
  personnel: string;
  decisionBasis: string;
  originalText: string;
  sourceFile?: string; // 添加来源文件名
  meetingDate?: string; // 添加会议日期
}

export function TIOBComp(props: {
  project: {
    name: string;
  } | null;
}) {
  // 使用项目特定的原子化状态
  const [tiobItems] = useAtom(
    props.project?.name 
      ? projectTiobItemsAtomFamily(props.project.name)
      : tiobItemsAtom // 如果没有项目ID，则使用全局原子状态作为备选
  );

  // 导出三重一大事项数据函数
  const exportTiobItems = (items: TIOBInterface[]) => {
    if (!items || items.length === 0) {
      toast.error("没有可导出的数据");
      return;
    }

    try {
      // 格式化导出数据
      const exportData = items.map((item) => ({
        来源文件: item.sourceFile || "未知",
        日期: item.meetingDate || "",
        类型:
          item.categoryType === "majorProject"
            ? "重大项目投资安排"
            : item.categoryType === "majorFund"
            ? "大额资金使用"
            : item.categoryType === "majorDecision"
            ? "重大问题决策"
            : item.categoryType,
        事项内容: item.details,
        金额: item.amount,
        责任部门: item.departments,
        相关人员: item.personnel,
        决策依据: item.decisionBasis,
      }));

      // 创建工作簿
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // 添加工作表到工作簿
      XLSX.utils.book_append_sheet(wb, ws, "三重一大事项");

      // 生成Excel文件并下载
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], {
        type: "application/octet-stream",
      });

      // 使用当前日期作为文件名的一部分
      const fileName = `${props.project?.name || "项目"}_三重一大事项_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      saveAs(blob, fileName);

      toast.success("导出成功");
    } catch (error) {
      console.error("导出数据失败:", error);
      toast.error("导出数据失败，请重试");
    }
  };

  return (
    <div className="flex flex-col space-y-4 w-full">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => exportTiobItems(tiobItems)}
        >
          <Download className="h-4 w-4" />
          导出数据
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">原文件名</TableHead>
              <TableHead className="whitespace-nowrap">日期</TableHead>
              <TableHead className="whitespace-nowrap">类型</TableHead>
              <TableHead className="min-w-[200px]">事项内容</TableHead>
              <TableHead className="whitespace-nowrap">金额</TableHead>
              <TableHead className="whitespace-nowrap">责任部门</TableHead>
              <TableHead className="whitespace-nowrap">相关人员</TableHead>
              <TableHead className="min-w-[200px]">决策依据</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tiobItems.map((item: any, index: any) => (
              <TableRow key={index}>
                <TableCell className="max-w-[150px] truncate" title={item.sourceFile || "未知"}>
                  {item.sourceFile || "未知"}
                </TableCell>
                <TableCell className="whitespace-nowrap">{item.meetingDate || ""}</TableCell>
                <TableCell className="font-medium whitespace-nowrap">
                  {
                    item.categoryType === "majorDecision"
                    ? "重大问题决策"
                    :
                    item.categoryType === "personnelAppointment"
                    ? "重要干部任免"
                    :
                  item.categoryType === "majorProject"
                    ? "重大项目投资安排"
                    : item.categoryType === "largeAmount"
                    ? "大额资金使用"
                    :  item.categoryType}
                </TableCell>
                <TableCell className="max-w-[250px]">{item.details}</TableCell>
                <TableCell className="whitespace-nowrap">{item.amount}</TableCell>
                <TableCell className="max-w-[150px] truncate" title={item.departments}>
                  {item.departments}
                </TableCell>
                <TableCell
                  className="max-w-[150px] truncate"
                  title={item.personnel}
                >
                  {item.personnel}
                </TableCell>
                <TableCell className="max-w-[250px]">{item.decisionBasis}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="text-sm text-muted-foreground">
        总计发现 {tiobItems.length} 项三重一大事项
      </div>
    </div>
  );
}
