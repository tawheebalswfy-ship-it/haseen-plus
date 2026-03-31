import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, CheckCheck, User, MessageSquare, Clock, FileText } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const typeIcons = {
  task_assigned: User,
  task_updated: FileText,
  comment_added: MessageSquare,
  mention: MessageSquare,
  due_soon: Clock,
};

const typeColors = {
  task_assigned: "bg-blue-100 text-blue-600",
  task_updated: "bg-purple-100 text-purple-600",
  comment_added: "bg-teal-100 text-teal-600",
  mention: "bg-amber-100 text-amber-600",
  due_soon: "bg-red-100 text-red-600",
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", currentUser?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: currentUser?.email }, "-created_date", 20),
    enabled: !!currentUser?.email,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const markReadMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Notification.update(id, { is_read: true });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(unread.map(n => 
        base44.entities.Notification.update(n.id, { is_read: true })
      ));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getLink = (notification) => {
    if (notification.entity_type === "remediation_task") {
      return createPageUrl("Remediation");
    }
    if (notification.entity_type === "policy") {
      return createPageUrl("Policies");
    }
    return createPageUrl("Dashboard");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold text-slate-900">Notifications</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs"
              onClick={() => markAllReadMutation.mutate()}
            >
              <CheckCheck className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No notifications</p>
          ) : (
            notifications.map(notification => {
              const Icon = typeIcons[notification.type] || Bell;
              const colorClass = typeColors[notification.type] || "bg-slate-100 text-slate-600";
              
              return (
                <Link
                  key={notification.id}
                  to={getLink(notification)}
                  onClick={() => {
                    if (!notification.is_read) {
                      markReadMutation.mutate(notification.id);
                    }
                    setOpen(false);
                  }}
                  className={`flex gap-3 p-3 hover:bg-slate-50 transition-colors border-b ${
                    !notification.is_read ? "bg-blue-50/50" : ""
                  }`}
                >
                  <div className={`p-2 rounded-lg ${colorClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!notification.is_read ? "font-medium" : ""} text-slate-900`}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{notification.message}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {format(new Date(notification.created_date), "MMM d, HH:mm")}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                  )}
                </Link>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}