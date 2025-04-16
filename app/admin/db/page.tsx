'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Database, ArrowRight } from 'lucide-react';
import { addStorageColumns, checkDatabaseHealth } from '@/lib/actions/db-actions';
import { toast } from 'sonner';

export default function DatabaseManagementPage() {
  const [loading, setLoading] = useState(false);
  const [healthResult, setHealthResult] = useState<{
    healthy: boolean;
    issues: string[];
    missingColumns: string[];
  } | null>(null);

  const handleCheckHealth = async () => {
    setLoading(true);
    try {
      const result = await checkDatabaseHealth();
      setHealthResult(result);
      
      if (result.healthy) {
        toast.success('数据库结构检查完成，未发现问题');
      } else {
        toast.warning('数据库结构检查完成，发现一些问题');
      }
    } catch (error) {
      console.error('检查数据库健康状态失败:', error);
      toast.error('检查数据库健康状态失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStorageColumns = async () => {
    setLoading(true);
    try {
      const result = await addStorageColumns();
      
      if (result.success) {
        toast.success(result.message);
        // 刷新健康状态
        handleCheckHealth();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('添加存储列失败:', error);
      toast.error('添加存储列失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <Database className="w-8 h-8 text-primary" />
        数据库管理
      </h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>数据库健康检查</CardTitle>
            <CardDescription>
              检查数据库结构是否完整，发现并修复潜在问题
            </CardDescription>
          </CardHeader>
          <CardContent>
            {healthResult && (
              <div className="mb-4">
                <Alert variant={healthResult.healthy ? "default" : "destructive"}>
                  <div className="flex items-center gap-2">
                    {healthResult.healthy ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <AlertCircle className="h-5 w-5" />
                    )}
                    <AlertTitle>
                      {healthResult.healthy ? '数据库结构正常' : '发现数据库结构问题'}
                    </AlertTitle>
                  </div>
                  <AlertDescription>
                    {healthResult.healthy 
                      ? '所有必要的表和列都存在，数据库结构完整。' 
                      : (
                        <div className="mt-2">
                          <p>发现以下问题:</p>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            {healthResult.issues.map((issue, index) => (
                              <li key={`issue-${index}`}>{issue}</li>
                            ))}
                          </ul>
                          
                          {healthResult.missingColumns.length > 0 && (
                            <div className="mt-2">
                              <p>缺失的列:</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {healthResult.missingColumns.map((column, index) => (
                                  <Badge key={`column-${index}`} variant="outline">{column}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    }
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button onClick={handleCheckHealth} disabled={loading}>
              {loading ? '检查中...' : '执行健康检查'}
            </Button>
            
            {healthResult && healthResult.missingColumns.length > 0 && (
              <Button onClick={handleAddStorageColumns} disabled={loading} variant="secondary">
                <span className="flex items-center gap-1">
                  添加缺失的存储列 <ArrowRight className="h-4 w-4" />
                </span>
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 