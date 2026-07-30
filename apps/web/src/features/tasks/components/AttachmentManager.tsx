import React, { useRef } from 'react';
import { useAttachments, useUploadAttachment, useDeleteAttachment } from '../hooks/useAttachments.js';
import { File, Paperclip, Trash2, FileText, Image, Video, Music } from 'lucide-react';
import { formatDuration } from '../../../utils/date.js';

interface AttachmentManagerProps {
  taskId: string;
}

export const AttachmentManager: React.FC<AttachmentManagerProps> = ({ taskId }) => {
  const { data: attachments = [], isLoading } = useAttachments(taskId);
  const uploadMutation = useUploadAttachment(taskId);
  const deleteMutation = useDeleteAttachment(taskId);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSimulatedUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simulate file storage details (e.g. Cloudinary/S3 keys)
    const storageKey = `attachments/task_${taskId}/${Date.now()}_${file.name}`;
    const mockUrl = URL.createObjectURL(file); // Local blob URL for immediate preview/mocking

    try {
      await uploadMutation.mutateAsync({
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        url: mockUrl,
        storageKey,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = (attachmentId: string) => {
    if (confirm('Are you sure you want to delete this attachment?')) {
      deleteMutation.mutate(attachmentId);
    }
  };

  const getFileIcon = (mime: string) => {
    if (mime.startsWith('image/')) return <Image className="w-4 h-4 text-accent-blue-text" />;
    if (mime.startsWith('video/')) return <Video className="w-4 h-4 text-accent-yellow-text" />;
    if (mime.startsWith('audio/')) return <Music className="w-4 h-4 text-accent-green-text" />;
    if (mime.includes('pdf') || mime.includes('word') || mime.includes('text')) {
      return <FileText className="w-4 h-4 text-accent-red-text" />;
    }
    return <File className="w-4 h-4 text-muted" />;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4 font-sans mt-6">
      <div className="flex items-center justify-between border-b border-border pb-1">
        <div className="flex items-center space-x-1.5">
          <Paperclip className="w-3.5 h-3.5 text-muted" />
          <h5 className="text-xs font-mono uppercase tracking-wider text-muted">Attachments</h5>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
          className="text-xs flex items-center text-charcoal hover:text-ink font-medium"
        >
          Upload
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleSimulatedUpload}
          className="hidden"
          accept="image/*,application/pdf,text/*"
        />
      </div>

      {/* Attachments List */}
      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="text-xs text-muted">Loading attachments...</div>
        ) : attachments.length === 0 ? (
          <div className="text-xs text-muted italic text-center py-4 bg-bone/30 rounded border border-dashed border-border">No attachments linked.</div>
        ) : (
          attachments.map((attach) => (
            <div
              key={attach.id}
              className="flex items-center justify-between p-2 border border-border bg-bone/10 hover:bg-bone/45 rounded-lg group transition-all"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                {getFileIcon(attach.fileType)}
                <div className="min-w-0 leading-tight">
                  <a
                    href={attach.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-charcoal hover:text-ink hover:underline truncate block"
                  >
                    {attach.fileName}
                  </a>
                  <span className="text-[10px] font-mono text-muted">{formatBytes(attach.fileSize)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(attach.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-accent-red-text hover:bg-accent-red-bg/30 rounded transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
export default AttachmentManager;
