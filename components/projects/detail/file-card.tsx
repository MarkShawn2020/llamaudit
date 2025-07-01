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
        <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                    <FileIcon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${getFileIconColor(file.fileType)}`}/>
                    <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-medium truncate" title={file.originalName}>
                            {file.originalName}
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                            {formatFileSize(file.fileSize)} • {new Date(file.uploadDate).toLocaleDateString()}
                        </CardDescription>
                    </div>
                    <FileStatusBadge status={file.status}/>
                </div>
            </CardHeader>

            {file.status === 'uploading' && (
                <CardContent className="pb-3">
                    <div className="space-y-1">
                        <Progress value={file.progress || 0} className="h-1.5"/>
                        <p className="text-xs text-muted-foreground text-right">{file.progress}%</p>
                    </div>
                </CardContent>
            )}

            {file.error && (
                <CardContent className="py-2">
                    <p className="text-xs text-destructive bg-destructive/10 p-2 rounded text-center">{file.error}</p>
                </CardContent>
            )}

            {isExpanded && file.analysisResult && (
                <CardContent className="pt-0 pb-3">
                    <div className="border rounded-md p-3 bg-muted/30">
                        <ScrollArea className="h-[160px]">
                            <div className="text-xs leading-relaxed whitespace-pre-wrap">
                                {file.analysisResult}
                            </div>
                        </ScrollArea>
                    </div>
                </CardContent>
            )}

            {/* 同步到知识库设置 */}
            {file.status === 'uploaded' || file.status === 'analyzed' ? (
                <CardContent className="py-2 border-t bg-muted/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {file.syncLoading ? (
                                <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />
                            ) : (
                                <Database className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            <Label htmlFor={`sync-${file.id}`} className="text-xs font-medium cursor-pointer">
                                同步知识库{file.syncLoading && <span className="text-blue-500 ml-1">(处理中)</span>}
                            </Label>
                        </div>
                        <Switch
                            id={`sync-${file.id}`}
                            checked={file.syncToKnowledgeBase ?? false}
                            onCheckedChange={(checked) => onSyncToggle?.(file, checked)}
                            disabled={['uploading', 'analyzing'].includes(file.status) || !!file.syncLoading}
                            className="scale-90"
                        />
                    </div>
                </CardContent>
            ) : null}

            <CardFooter className="pt-2 pb-3 flex gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(file)}
                    disabled={['uploading', 'analyzing'].includes(file.status)}
                    className="flex-1 h-8 text-xs"
                >
                    <Trash2 className="h-3.5 w-3.5 mr-1"/>
                    删除
                </Button>

                {canAnalyze && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAnalyze(file)}
                        className="flex-1 h-8 text-xs"
                    >
                        <RefreshCw className="h-3.5 w-3.5 mr-1"/>
                        {file.status === 'analyzed' ? '重新分析' : '分析'}
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}