import { toast } from '@/components/ui/use-toast'
import { useCallback, useState } from 'react'

export function OssUpload() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleUpload = useCallback(async (file: File) => {
    try {
      setUploading(true)
      setProgress(0)

      // 1. 获取上传签名 URL
      const response = await fetch('/api/oss/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
      })

      if (!response.ok) throw new Error('Failed to get upload URL')
      const { url } = await response.json()

      // 2. 使用签名 URL 上传文件
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', url, true)
      xhr.setRequestHeader('Content-Type', file.type)

      // 设置上传进度监听
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentage = (e.loaded / e.total) * 100
          setProgress(Math.round(percentage))
        }
      }

      // 创建 Promise 包装 XHR 请求
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(xhr.response)
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`))
          }
        }
        xhr.onerror = () => reject(new Error('Upload failed'))
      })

      // 发送文件
      xhr.send(file)
      await uploadPromise

      toast({
        title: "上传成功",
        description: `文件 ${file.name} 已成功上传`,
      })

      return url
    } catch (error) {
      console.error('Upload failed:', error)
      toast({
        title: "上传失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
      throw error
    } finally {
      setUploading(false)
    }
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <input
        type="file"
        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (file) {
            try {
              await handleUpload(file)
            } catch (error) {
              console.error('Upload failed:', error)
            }
          }
        }}
      />
      {uploading && (
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
} 