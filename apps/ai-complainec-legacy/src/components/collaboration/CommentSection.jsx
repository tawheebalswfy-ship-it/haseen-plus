import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function CommentSection({ entityType, entityId }) {
  const [newComment, setNewComment] = useState("");
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["comments", entityType, entityId],
    queryFn: () => base44.entities.Comment.filter({ entity_type: entityType, entity_id: entityId }),
  });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content) => {
      // Extract mentions (@email)
      const mentions = content.match(/@[\w.-]+@[\w.-]+/g)?.map(m => m.slice(1)) || [];
      
      const comment = await base44.entities.Comment.create({
        content,
        entity_type: entityType,
        entity_id: entityId,
        author_name: currentUser?.full_name || "User",
        author_email: currentUser?.email,
        mentions
      });

      // Create notifications for mentions
      for (const email of mentions) {
        await base44.entities.Notification.create({
          user_email: email,
          title: "You were mentioned",
          message: `${currentUser?.full_name || "Someone"} mentioned you in a comment`,
          type: "mention",
          entity_type: entityType,
          entity_id: entityId
        });
      }

      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", entityType, entityId] });
      setNewComment("");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newComment.trim()) {
      addCommentMutation.mutate(newComment);
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-slate-900">Discussion</h4>
      
      {/* Comment List */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">No comments yet</p>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-teal-100 text-teal-700 text-xs">
                  {comment.author_name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">{comment.author_name}</span>
                  <span className="text-xs text-slate-400">
                    {format(new Date(comment.created_date), "MMM d, HH:mm")}
                  </span>
                </div>
                <p className="text-sm text-slate-700 mt-1">{comment.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Comment */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment... (use @email to mention)"
          className="min-h-[60px] resize-none"
        />
        <Button 
          type="submit" 
          size="icon" 
          disabled={!newComment.trim() || addCommentMutation.isPending}
          className="bg-teal-600 hover:bg-teal-700"
        >
          {addCommentMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </form>
    </div>
  );
}