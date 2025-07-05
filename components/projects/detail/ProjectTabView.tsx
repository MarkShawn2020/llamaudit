'use client';

import {useState} from 'react';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Brain, Database, FileText, Upload} from 'lucide-react';
import FilesTab from './FilesTab';
import {KnowledgeBaseTab} from './KnowledgeBaseTab';
import {UIFile} from '@/components/projects/utils/ui-file';
import {Badge} from '@/components/ui/badge';
import {useKnowledgeBases, useKnowledgeBaseStats} from '@/hooks/use-knowledge-base';

interface ProjectTabViewProps {
    projectId: string;
    projectName: string;
    initialFiles?: UIFile[];
    onFileChange?: (files: UIFile[]) => void;
}

export default function ProjectTabView({
                                           projectId, projectName, initialFiles = [], onFileChange
                                       }: ProjectTabViewProps) {
    const [activeTab, setActiveTab] = useState('knowledge-base');

    // 获取知识库数据
    const {data: knowledgeBases = []} = useKnowledgeBases(projectId);
    const {data: knowledgeBaseStats = {}} = useKnowledgeBaseStats(projectId, knowledgeBases);

    // 统计信息
    const documentCount = initialFiles?.length || 0;
    const analyzedCount = initialFiles?.filter(f => f.status === 'analyzed')?.length || 0;

    // 知识库文档数量
    const knowledgeBaseDocumentCount = Object.values(knowledgeBaseStats).reduce((total, stats) => total + stats.documentCount, 0);

    return (<div className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between mb-4">
                <TabsList className="grid w-auto grid-cols-2">


                    <TabsTrigger value="knowledge-base" className="flex items-center gap-2 px-4">
                        <Brain className="h-4 w-4"/>
                        <span>知识库</span>
                        {knowledgeBaseDocumentCount > 0 && (
                            <Badge variant="secondary" className="ml-1 text-xs">
                                {knowledgeBaseDocumentCount}
                            </Badge>
                        )}
                    </TabsTrigger>

                    <TabsTrigger value="documents" className="flex items-center gap-2 px-4">
                        <FileText className="h-4 w-4"/>
                        <span>文档分析</span>
                        <Badge variant="secondary" className="ml-1 text-xs">
                            {analyzedCount}/{documentCount}
                        </Badge>

                    </TabsTrigger>
                </TabsList>

                {/* 状态指示器 */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {activeTab === 'documents' && (<div className="flex items-center gap-2">
                        <Upload className="h-4 w-4"/>
                        <span>{documentCount} 个文件</span>
                        {analyzedCount > 0 && (<>
                            <span>•</span>
                            <span className="text-green-600">{analyzedCount} 已分析</span>
                        </>)}
                    </div>)}

                    {activeTab === 'knowledge-base' && (<div className="flex items-center gap-2">
                            <Database className="h-4 w-4"/>
                            <span>{knowledgeBaseDocumentCount} 个文档</span>
                            {knowledgeBaseDocumentCount > 0 && (<>
                                    <span>•</span>
                                    <span className="text-green-600">智能问答已启用</span>
                                </>)}
                        </div>)}
                </div>
            </div>


            <TabsContent value="knowledge-base" className="mt-0">
                <KnowledgeBaseTab
                    auditUnitId={projectId}
                    auditUnitName={projectName}
                />
            </TabsContent>

            <TabsContent value="documents" className="mt-0">
                <FilesTab
                    projectId={projectId}
                    initialFiles={initialFiles}
                    onFileChange={onFileChange}
                />
            </TabsContent>
        </Tabs>
    </div>);
}
