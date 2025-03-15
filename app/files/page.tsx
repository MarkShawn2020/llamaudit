import { FileUpload } from '@/app/components/FileUpload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Upload } from 'lucide-react';

export default function FilesPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">文件管理</h1>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            上传文件
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            我的文件
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>上传文件</CardTitle>
              <CardDescription>
                支持上传PDF、Word文档和图片文件，单个文件大小不超过10MB
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload 
                onUploadComplete={(file) => {
                  console.log('文件上传成功:', file);
                  // 可以在这里添加上传成功后的处理逻辑
                }}
                onUploadError={(error) => {
                  console.error('文件上传失败:', error);
                  // 可以在这里添加上传失败后的处理逻辑
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle>我的文件</CardTitle>
              <CardDescription>
                查看和管理您上传的所有文件
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">暂无文件</h3>
                <p className="text-muted-foreground mb-6">
                  您还没有上传任何文件，请点击上传文件标签页开始上传
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const element = document.querySelector('[data-value="upload"]');
                    if (element instanceof HTMLElement) {
                      element.click();
                    }
                  }}
                >
                  上传第一个文件
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 