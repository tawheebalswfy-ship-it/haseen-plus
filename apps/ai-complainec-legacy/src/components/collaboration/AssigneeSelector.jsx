import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Users, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AssigneeSelector({ value, onChange, onAssign }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["teams"],
    queryFn: () => base44.entities.Team.list(),
  });

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTeams = teams.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = async (type, item) => {
    const assignee = type === "user" ? item.email : `team:${item.id}`;
    onChange?.(assignee);
    
    if (onAssign && type === "user") {
      await onAssign(item.email, item.full_name);
    } else if (onAssign && type === "team") {
      // Notify all team members
      for (const email of item.members || []) {
        await onAssign(email, item.name);
      }
    }
    
    setOpen(false);
  };

  const getDisplayValue = () => {
    if (!value) return null;
    if (value.startsWith("team:")) {
      const team = teams.find(t => t.id === value.replace("team:", ""));
      return { type: "team", name: team?.name || "Team" };
    }
    const user = users.find(u => u.email === value);
    return { type: "user", name: user?.full_name || value };
  };

  const displayValue = getDisplayValue();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-between w-full">
          {displayValue ? (
            <div className="flex items-center gap-2">
              {displayValue.type === "team" ? (
                <Users className="w-4 h-4 text-slate-500" />
              ) : (
                <User className="w-4 h-4 text-slate-500" />
              )}
              <span>{displayValue.name}</span>
            </div>
          ) : (
            <span className="text-slate-500">Assign to...</span>
          )}
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <Input
          placeholder="Search users or teams..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2"
        />
        
        <div className="max-h-48 overflow-y-auto">
          {filteredTeams.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-semibold text-slate-500 px-2 py-1">Teams</p>
              {filteredTeams.map(team => (
                <button
                  key={team.id}
                  onClick={() => handleSelect("team", team)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-slate-100 transition-colors text-left",
                    value === `team:${team.id}` && "bg-teal-50"
                  )}
                >
                  <Users className="w-4 h-4 text-slate-500" />
                  <span className="text-sm flex-1">{team.name}</span>
                  {value === `team:${team.id}` && <Check className="w-4 h-4 text-teal-600" />}
                </button>
              ))}
            </div>
          )}
          
          {filteredUsers.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 px-2 py-1">Users</p>
              {filteredUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleSelect("user", user)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-slate-100 transition-colors text-left",
                    value === user.email && "bg-teal-50"
                  )}
                >
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-xs bg-slate-200">
                      {user.full_name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{user.full_name || user.email}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                  {value === user.email && <Check className="w-4 h-4 text-teal-600" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}