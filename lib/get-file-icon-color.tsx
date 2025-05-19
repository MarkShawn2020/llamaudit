/**
 * 获取文件图标颜色
 */
export function getFileIconColor(fileType: string): string {
    if (fileType.includes('pdf')) return 'text-red-500';
    if (fileType.includes('word') || fileType.includes('doc')) return 'text-blue-500';
    if (fileType.includes('excel') || fileType.includes('sheet') || fileType.includes('csv')) return 'text-green-500';
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return 'text-orange-500';
    if (fileType.includes('image')) return 'text-purple-500';
    return 'text-gray-500';
}