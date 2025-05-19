import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { AlertTriangle, Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useAtom } from "jotai";
import { tiobItemsAtom } from "@/components/projects/detail/project-atoms";

export interface TIOBInterface {
  categoryType: string;
  details: string;
  amount: string;
  departments: string;
  personnel: string;
  decisionBasis: string;
  originalText: string;
  sourceFile?: string; // 添加来源文件名
}

export function TIOBComp(props: {
  project: {
    name: string;
  } | null;
}) {
  // 使用Jotai原子化状态替换props传递
  const [tiobItems] = useAtom(tiobItemsAtom);

  // 导出三重一大事项数据函数
  const exportTiobItems = (items: TIOBInterface[]) => {
    if (!items || items.length === 0) {
      toast.error("没有可导出的数据");
      return;
    }

    try {
      // 格式化导出数据
      const exportData = items.map((item) => ({
        类型:
          item.categoryType === "majorProject"
            ? "重大项目"
            : item.categoryType === "majorFund"
            ? "大额资金"
            : item.categoryType === "majorDecision"
            ? "重大决策"
            : item.categoryType,
        事项内容: item.details,
        金额: item.amount,
        责任部门: item.departments,
        相关人员: item.personnel,
        决策依据: item.decisionBasis,
        来源文件: item.sourceFile || "未知",
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
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg">三重一大事项分析</CardTitle>
          </div>
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
        <CardDescription>
          从项目文档中提取的重大决策、项目安排、资金使用等事项
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>类型</TableHead>
              <TableHead>事项内容</TableHead>
              <TableHead>金额</TableHead>
              <TableHead>责任部门</TableHead>
              <TableHead>相关人员</TableHead>
              <TableHead>决策依据</TableHead>
              <TableHead>原文件名</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tiobItems.map((item: any, index: any) => (
              <TableRow key={index}>
                <TableCell className="font-medium">
                  {item.categoryType === "majorProject"
                    ? "重大项目"
                    : item.categoryType === "majorFund"
                    ? "大额资金"
                    : item.categoryType === "majorDecision"
                    ? "重大决策"
                    : item.categoryType}
                </TableCell>
                <TableCell>{item.details}</TableCell>
                <TableCell>{item.amount}</TableCell>
                <TableCell>{item.departments}</TableCell>
                <TableCell
                  className="max-w-[200px] truncate"
                  title={item.personnel}
                >
                  {item.personnel}
                </TableCell>
                <TableCell>{item.decisionBasis}</TableCell>
                <TableCell>{item.sourceFile || "未知"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="mt-4 text-sm text-muted-foreground">
          总计发现 {tiobItems.length} 项三重一大事项
        </div>
      </CardContent>
    </Card>
  );
}
