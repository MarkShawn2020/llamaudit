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
import {FileIcon, RefreshCw, Trash2, Database, Loader2, ChevronDown, ChevronUp} from "lucide-react";
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
                             onToggleExpanded,
                             onSyncToggle
                         }: {
    file: UIFile;
    onAnalyze: (file: UIFile) => void;
    onRemove: (file: UIFile) => void;
    expanded: boolean;
    onToggleExpanded: (fileId: string) => void;
    onSyncToggle?: (file: UIFile, syncEnabled: boolean) => void;
}) {
    const canAnalyze = file.status === 'uploaded' || file.status === 'analysis_failed' || file.status === 'analyzed';
    const hasAnalysisResult = file.analysisResult && file.analysisResult.trim().length > 0;
    const shouldShowAnalyzing = file.status === 'analyzing';

    return (
        <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200">
            {/* 文件头部信息 */}
            <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                    <FileIcon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${getFileIconColor(file.fileType)}`}/>
                    <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-medium truncate" title={file.originalName}>
                            {file.originalName}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1 flex items-center gap-2">
                            <span>{formatFileSize(file.fileSize)}</span>
                            <span>•</span>
                            <span>{new Date(file.uploadDate).toLocaleDateString()}</span>
                        </CardDescription>
                    </div>
                    {/* 删除按钮 - 作为辅助操作放在头部 */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemove(file)}
                        disabled={['uploading', 'analyzing'].includes(file.status)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    >
                        <Trash2 className="h-3.5 w-3.5"/>
                    </Button>
                </div>
            </CardHeader>

            {/* 上传进度条 */}
            {file.status === 'uploading' && (
                <CardContent className="pt-0 pb-3">
                    <div className="space-y-2">
                        <Progress value={file.progress || 0} className="h-2"/>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">上传中...</span>
                            <span className="text-xs text-muted-foreground">{file.progress}%</span>
                        </div>
                    </div>
                </CardContent>
            )}

            {/* 错误信息 */}
            {file.error && (
                <CardContent className="pt-0 pb-3">
                    <div className="text-xs text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
                        {file.error}
                    </div>
                </CardContent>
            )}

            {/* 主要功能操作区域 */}
            <CardContent className="pt-0 pb-3">
                <div className="flex gap-2">
                    {/* 分析按钮 */}
                    {canAnalyze && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onAnalyze(file)}
                            disabled={file.status === 'analyzing'}
                            className="flex-1 h-8 text-xs"
                        >
                            {file.status === 'analyzing' ? (
                                <>
                                    <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin"/>
                                    分析中...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="h-3.5 w-3.5 mr-1"/>
                                    {file.status === 'analyzed' ? '重新分析' : '分析'}
                                </>
                            )}
                        </Button>
                    )}

                    {/* 查看结果按钮 - 只在有结果时显示 */}
                    {hasAnalysisResult && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onToggleExpanded(file.id)}
                            className="flex-1 h-8 text-xs"
                        >
                            {expanded ? (
                                <>
                                    <ChevronUp className="h-3.5 w-3.5 mr-1"/>
                                    收起结果
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="h-3.5 w-3.5 mr-1"/>
                                    查看结果
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </CardContent>

            {/* 分析结果内容 */}
            {expanded && hasAnalysisResult && (
                <CardContent className="pt-0 pb-3">
                    <div className="border rounded-md bg-muted/30">
                        <div className="p-3 border-b bg-muted/50">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-green-500"/>
                                <span className="text-xs font-medium text-muted-foreground">分析结果</span>
                            </div>
                        </div>
                        <ScrollArea className="h-[160px]">
                            <div className="p-3 text-xs leading-relaxed whitespace-pre-wrap">
                                {file.analysisResult}
                            </div>
                        </ScrollArea>
                    </div>
                </CardContent>
            )}

            {/* 分析进行中的状态 */}
            {shouldShowAnalyzing && expanded && (
                <CardContent className="pt-0 pb-3">
                    <div className="border rounded-md bg-muted/30">
                        <div className="p-3 border-b bg-muted/50">
                            <div className="flex items-center gap-2">
                                <RefreshCw className="h-3 w-3 animate-spin text-blue-500"/>
                                <span className="text-xs font-medium text-muted-foreground">正在分析...</span>
                            </div>
                        </div>
                        <ScrollArea className="h-[160px]">
                            <div className="p-3 text-xs leading-relaxed whitespace-pre-wrap">
                                {file.analysisResult || '正在分析中，请稍候...'}
                            </div>
                        </ScrollArea>
                    </div>
                </CardContent>
            )}

            {/* 知识库同步设置 */}
            {(file.status === 'uploaded' || file.status === 'analyzed') && (
                <CardFooter className="pt-2 pb-3 border-t bg-muted/10">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                            {file.syncLoading ? (
                                <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />
                            ) : (
                                <Database className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            <Label htmlFor={`sync-${file.id}`} className="text-xs font-medium cursor-pointer">
                                同步到知识库
                                {file.syncLoading && <span className="text-blue-500 ml-1">(处理中)</span>}
                            </Label>
                        </div>
                        <Switch
                            id={`sync-${file.id}`}
                            checked={file.syncToKnowledgeBase ?? false}
                            onCheckedChange={(checked) => onSyncToggle?.(file, checked)}
                            disabled={['uploading', 'analyzing'].includes(file.status) || !!file.syncLoading}
                            size="sm"
                        />
                    </div>
                </CardFooter>
            )}
        </Card>
    );
}