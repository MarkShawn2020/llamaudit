import {FileStatusBadge} from "@/components/projects/utils/file-status-badge";
import {UIFile} from "@/components/projects/utils/ui-file";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {Progress} from "@/components/ui/progress";
import {ScrollArea} from "@/components/ui/scroll-area";
import {Switch} from "@/components/ui/switch";
import {Label} from "@/components/ui/label";
import {formatFileSize} from "@/lib/format-file-size";
import {getFileIconColor} from "@/lib/get-file-icon-color";
import {FileIcon, RefreshCw, Trash2, Database, Loader2} from "lucide-react";
// import Markdown from "react-markdown";
// import remarkGfm from "remark-gfm";

/**
 * 单个文档卡片组件
 */
export function FileCard({
                             file,
                             onAnalyze,
                             onRemove,
                             expanded,
                             onSyncToggle
                         }: {
    file: UIFile;
    onAnalyze: (file: UIFile) => void;
    onRemove: (file: UIFile) => void;
    expanded: boolean;
    onSyncToggle?: (file: UIFile, syncEnabled: boolean) => void;
}) {
    const canAnalyze = file.status === 'uploaded' || file.status === 'analysis_failed' || file.status === 'analyzed';
    const isExpanded = expanded || file.status === 'analyzing' || file.status === 'analyzed';

    return (
        <Card className="mb-4 overflow-hidden">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <FileIcon className={`h-6 w-6 ${getFileIconColor(file.fileType)}`}/>
                        <div>
                            <CardTitle className="text-sm font-medium">{file.originalName}</CardTitle>
                            <CardDescription className="text-xs">
                                {formatFileSize(file.fileSize)} • {new Date(file.uploadDate).toLocaleString()}
                            </CardDescription>
                        </div>
                    </div>
                    <FileStatusBadge status={file.status}/>
                </div>
            </CardHeader>

            {file.status === 'uploading' && (
                <CardContent className="pb-2">
                    <Progress value={file.progress || 0} className="h-2"/>
                    <p className="text-xs text-muted-foreground mt-1 text-right">{file.progress}%</p>
                </CardContent>
            )}

            {file.error && (
                <CardContent className="py-2">
                    <p className="text-xs text-red-500 italic">{file.error}</p>
                </CardContent>
            )}

            {isExpanded && file.analysisResult && (
                <CardContent className="pt-0 pb-2">
                    <div className="border rounded-md p-3 bg-gray-50 mt-2">
                        <ScrollArea className="h-[200px]">
                            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm">
                                {file.analysisResult}
                            </div>
                        </ScrollArea>
                    </div>
                </CardContent>
            )}

            {/* 同步到知识库设置 */}
            {file.status === 'uploaded' || file.status === 'analyzed' ? (
                <CardContent className="py-2 border-t">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            {file.syncLoading ? (
                                <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                            ) : (
                                <Database className="h-4 w-4 text-muted-foreground" />
                            )}
                            <Label htmlFor={`sync-${file.id}`} className="text-sm font-medium">
                                同步到知识库
                                {file.syncLoading && <span className="text-blue-500 ml-1">处理中...</span>}
                            </Label>
                        </div>
                        <Switch
                            id={`sync-${file.id}`}
                            checked={file.syncToKnowledgeBase ?? false}
                            onCheckedChange={(checked) => onSyncToggle?.(file, checked)}
                            disabled={file.status === 'uploading' || file.status === 'analyzing' || file.syncLoading}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-6">
                        启用后文档将自动添加到项目知识库，支持AI智能问答
                    </p>
                </CardContent>
            ) : null}

            <CardFooter className="pt-0 pb-3 flex justify-between">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(file)}
                    disabled={file.status === 'uploading' || file.status === 'analyzing'}
                >
                    <Trash2 className="h-4 w-4 mr-1"/>
                    删除
                </Button>

                {canAnalyze && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAnalyze(file)}
                    >
                        <RefreshCw className="h-4 w-4 mr-1"/>
                        {file.status === 'analyzed' ? '重新分析' : '分析'}
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}