import {FileStatus} from "@/components/projects/utils/file-status";
import {Badge} from "@/components/ui/badge";
import {AlertCircle, CheckCircle, Clock, RefreshCw} from "lucide-react";

/**
 * 文档状态徽章组件
 */
export function FileStatusBadge({status}: { status: FileStatus }) {
    switch (status) {
        case 'uploading':
            return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Clock
                className="h-3 w-3 mr-1"/> 上传中</Badge>;
        case 'upload_failed':
            return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1"/> 上传失败</Badge>;
        case 'uploaded':
            return <Badge variant="outline" className="border-green-500 text-green-500"><CheckCircle
                className="h-3 w-3 mr-1"/> 已上传</Badge>;
        case 'analyzing':
            return <Badge variant="secondary" className="bg-purple-100 text-purple-800"><RefreshCw
                className="h-3 w-3 mr-1 animate-spin"/> 分析中</Badge>;
        case 'analysis_failed':
            return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1"/> 分析失败</Badge>;
        default:
            return null;
    }
}