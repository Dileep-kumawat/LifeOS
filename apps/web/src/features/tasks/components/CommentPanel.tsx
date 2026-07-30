import React, { useState } from 'react';
import { useComments, useCreateComment, useDeleteComment } from '../hooks/useComments.js';
import { useAuthStore } from '../../../store/useAuthStore.js';
import { Send, Trash2, MessageSquare, Clock } from 'lucide-react';

interface CommentPanelProps {
  taskId: string;
}

export const CommentPanel: React.FC<CommentPanelProps> = ({ taskId }) => {
  const { user } = useAuthStore();
  const { data: comments = [], isLoading } = useComments(taskId);
  const createMutation = useCreateComment(taskId);
  const deleteMutation = useDeleteComment(taskId);

  const [content, setContent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      await createMutation.mutateAsync({ content: content.trim() });
      setContent('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = (commentId: string) => {
    if (confirm('Delete this comment?')) {
      deleteMutation.mutate(commentId);
    }
  };

  return (
    <div className="space-y-4 font-sans mt-6">
      <div className="flex items-center space-x-1.5 border-b border-border pb-1">
        <MessageSquare className="w-3.5 h-3.5 text-muted" />
        <h5 className="text-xs font-mono uppercase tracking-wider text-muted">Comments</h5>
      </div>

      {/* Write Comment Form */}
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 text-xs border border-border focus:border-charcoal focus:ring-0 outline-none rounded p-2 bg-surface text-charcoal font-medium placeholder:text-muted/65"
        />
        <button
          type="submit"
          disabled={createMutation.isPending || !content.trim()}
          className="p-2 bg-ink text-surface rounded border border-ink hover:bg-charcoal active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* Comments List */}
      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="text-xs text-muted">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="text-xs text-muted italic text-center py-4 bg-bone/30 rounded border border-dashed border-border">No comments yet.</div>
        ) : (
          comments.map((comment) => {
            const isAuthor = user?.id === comment.userId;
            const date = new Date(comment.createdAt);

            return (
              <div key={comment.id} className="p-2.5 border border-border bg-bone/20 hover:bg-bone/40 rounded-lg space-y-1.5 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-[10px] font-mono text-muted">
                    <span className="font-semibold text-charcoal">
                      {isAuthor ? 'You' : 'Author'}
                    </span>
                    <span className="opacity-60">•</span>
                    <div className="flex items-center space-x-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {isAuthor && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="p-1 text-muted hover:text-accent-red-text hover:bg-accent-red-bg/30 rounded transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-charcoal leading-relaxed whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
export default CommentPanel;
