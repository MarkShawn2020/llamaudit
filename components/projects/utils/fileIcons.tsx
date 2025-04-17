import {
  FileText,
  FileType,
  Image,
  FileSpreadsheet,
  FileCode,
  FileCog,
  FileAudio,
  FileVideo,
  FileX,
  File
} from 'lucide-react';

export const getFileIcon = (filename: string) => {
  if (!filename) return <FileText className="h-4 w-4 text-blue-500" />;
  
  const extension = filename.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return <FileType className="h-4 w-4 text-red-500" />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
    case 'webp':
      return <Image className="h-4 w-4 text-purple-500" />;
    case 'xls':
    case 'xlsx':
    case 'csv':
      return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
    case 'doc':
    case 'docx':
      return <FileText className="h-4 w-4 text-blue-500" />;
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'html':
    case 'css':
    case 'py':
    case 'java':
    case 'c':
    case 'cpp':
      return <FileCode className="h-4 w-4 text-yellow-500" />;
    case 'json':
    case 'xml':
      return <FileCog className="h-4 w-4 text-orange-500" />;
    case 'mp3':
    case 'wav':
    case 'ogg':
      return <FileAudio className="h-4 w-4 text-pink-500" />;
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'wmv':
      return <FileVideo className="h-4 w-4 text-indigo-500" />;
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      return <FileX className="h-4 w-4 text-stone-500" />;
    default:
      return <File className="h-4 w-4 text-gray-500" />;
  }
}; 