// 文件状态枚举
export type FileStatus =
    | 'pending'
    | 'uploading' // 正在上传
    | 'upload_failed' // 上传失败
    | 'uploaded' // 已上传
    | 'analyzing' // 正在分析
    | 'analysis_failed' // 分析失败
    | 'analyzed'; // 已分析