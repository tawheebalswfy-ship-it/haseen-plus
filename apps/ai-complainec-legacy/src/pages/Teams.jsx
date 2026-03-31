import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Users, Trash2, UserPlus, Crown } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";

export default function Teams() {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [newMemberEmail, setNewMemberEmail] = useState("");

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: () => base44.entities.Team.list("-created_date"),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Team.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setShowCreateDialog(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Team.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Team.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setSelectedTeam(null);
    }
  });

  const addMember = () => {
    if (!newMemberEmail || !selectedTeam) return;
    const members = [...(selectedTeam.members || []), newMemberEmail];
    updateMutation.mutate({ id: selectedTeam.id, data: { members } });
    setSelectedTeam({ ...selectedTeam, members });
    setNewMemberEmail("");
  };

  const removeMember = (email) => {
    const members = selectedTeam.members.filter(m => m !== email);
    updateMutation.mutate({ id: selectedTeam.id, data: { members } });
    setSelectedTeam({ ...selectedTeam, members });
  };

  const getUserName = (email) => {
    const user = users.find(u => u.email === email);
    return user?.full_name || email;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Teams"
          description="Manage teams for collaborative compliance work"
          backTo="Dashboard"
          backLabel="Dashboard"
          actions={
            <Button className="bg-slate-900 hover:bg-slate-800" onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Team
            </Button>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(team => (
            <Card 
              key={team.id} 
              className="p-5 bg-white border-0 shadow-sm hover:shadow-md transition-all cursor-pointer"
              onClick={() => setSelectedTeam(team)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-teal-100">
                  <Users className="w-5 h-5 text-teal-600" />
                </div>
                <Badge variant="outline">{team.members?.length || 0} members</Badge>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{team.name}</h3>
              {team.description && (
                <p className="text-sm text-slate-500 line-clamp-2">{team.description}</p>
              )}
              <div className="flex -space-x-2 mt-4">
                {team.members?.slice(0, 5).map((email, idx) => (
                  <Avatar key={idx} className="w-8 h-8 border-2 border-white">
                    <AvatarFallback className="text-xs bg-slate-200">
                      {getUserName(email).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {(team.members?.length || 0) > 5 && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs text-slate-600">
                    +{team.members.length - 5}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {teams.length === 0 && (
          <Card className="p-12 bg-white border-0 shadow-sm text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No teams yet</h3>
            <p className="text-slate-500 mb-4">Create teams to collaborate on compliance tasks</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Team
            </Button>
          </Card>
        )}

        {/* Create Team Dialog */}
        <CreateTeamDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onCreate={(data) => createMutation.mutate(data)}
        />

        {/* Team Details Dialog */}
        <Dialog open={!!selectedTeam} onOpenChange={() => setSelectedTeam(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" />
                {selectedTeam?.name}
              </DialogTitle>
            </DialogHeader>
            
            {selectedTeam && (
              <div className="space-y-6 pt-4">
                {selectedTeam.description && (
                  <p className="text-slate-600">{selectedTeam.description}</p>
                )}

                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-3">Team Members</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedTeam.members?.map(email => (
                      <div key={email} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs bg-teal-100 text-teal-700">
                              {getUserName(email).charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{getUserName(email)}</p>
                            <p className="text-xs text-slate-500">{email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {email === selectedTeam.lead_email && (
                            <Crown className="w-4 h-4 text-amber-500" />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600"
                            onClick={() => removeMember(email)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {(!selectedTeam.members || selectedTeam.members.length === 0) && (
                      <p className="text-sm text-slate-500 text-center py-4">No members yet</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Add member by email..."
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                  />
                  <Button onClick={addMember} disabled={!newMemberEmail}>
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex justify-between pt-4 border-t">
                  <Button
                    variant="ghost"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => deleteMutation.mutate(selectedTeam.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Team
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedTeam(null)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function CreateTeamDialog({ open, onOpenChange, onCreate }) {
  const [formData, setFormData] = useState({ name: "", description: "" });

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate({ ...formData, members: [] });
    setFormData({ name: "", description: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Team</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Team Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Security Team"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Team description..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-slate-900">Create Team</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}