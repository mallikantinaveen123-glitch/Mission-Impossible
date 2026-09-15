import { useState, useEffect } from "react";
import { Search, BookOpen, AlertTriangle, FileText, CheckCircle, Edit, Trash2, Plus } from "lucide-react";
import { getRules, createRule, updateRule, deleteRule, USE_DEMO_DATA } from "@/services/api";
import type { TrafficRule } from "@/services/api";

export default function TrafficRules() {
  const [searchTerm, setSearchTerm] = useState("");
  const [rulesData, setRulesData] = useState<TrafficRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TrafficRule | null>(null);
  const [formData, setFormData] = useState({
    code: "", title: "", category: "", penalty: "", description: ""
  });

  const fetchRules = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getRules();
      setRulesData(data);
    } catch (err: any) {
      setError(err.message || "Failed to load rules");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const filteredRules = rulesData.filter(rule => 
    (rule.title?.toLowerCase() || "").includes(searchTerm.toLowerCase()) || 
    (rule.category?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (rule.code?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const openModal = (rule?: TrafficRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        code: rule.code, title: rule.title, category: rule.category, 
        penalty: rule.penalty, description: rule.description
      });
    } else {
      setEditingRule(null);
      setFormData({ code: "", title: "", category: "", penalty: "", description: "" });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingRule) {
        await updateRule(editingRule.id, formData);
      } else {
        await createRule(formData);
      }
      setIsModalOpen(false);
      fetchRules();
    } catch (err) {
      console.error("Failed to save rule", err);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to deactivate this rule?")) {
      try {
        await deleteRule(id);
        fetchRules();
      } catch (err) {
        console.error("Failed to delete rule", err);
      }
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 gap-4 bg-card rounded-lg border border-border shadow-sm">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-bold">Failed to load rules</h2>
        <p className="text-muted-foreground">{error}</p>
        <button onClick={fetchRules} className="px-4 py-2 bg-primary text-primary-foreground rounded-md">Retry</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-6 w-full">
      <div className="flex justify-between items-center bg-card p-4 rounded-lg border border-border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="text-primary" />
            Traffic Rules & Penalties
            {USE_DEMO_DATA && <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">Demo Mode</span>}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Quick reference for traffic violations, penalties, and regulations.</p>
        </div>
        <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> Add New Rule
        </button>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm p-4">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search rules, categories, codes, or penalties..." 
            className="w-full bg-background border border-border rounded-md pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="border border-border rounded-lg p-5 bg-muted/20 animate-pulse h-40"></div>
             ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRules.map(rule => (
              <div key={rule.id} className="border border-border rounded-lg p-5 hover:border-primary/50 hover:shadow-md transition-all group bg-background flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-1 bg-primary/10 text-primary rounded-full uppercase tracking-wider">
                      {rule.category}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">{rule.code}</span>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openModal(rule)} className="text-muted-foreground hover:text-primary"><Edit className="h-4 w-4" /></button>
                    {/* Note: Admin-only restriction check should go around the delete button */}
                    <button onClick={() => handleDelete(rule.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <h3 className="font-bold text-lg mb-2">{rule.title}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{rule.description}</p>
                
                <div className="mt-auto pt-3 border-t border-border flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-destructive">Penalty: {rule.penalty}</span>
                </div>
              </div>
            ))}
            
            {filteredRules.length === 0 && (
              <div className="col-span-full py-12 flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-lg">
                <CheckCircle className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-lg font-medium">No matching rules found</p>
                <p className="text-sm">Try adjusting your search terms.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-md rounded-lg shadow-lg border border-border flex flex-col">
            <div className="p-4 border-b border-border font-semibold">
              {editingRule ? "Edit Traffic Rule" : "Add New Traffic Rule"}
            </div>
            <div className="p-4 flex flex-col gap-4">
              <input placeholder="Code (e.g. HLM01)" className="w-full border p-2 rounded bg-background" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
              <input placeholder="Title" className="w-full border p-2 rounded bg-background" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              <input placeholder="Category" className="w-full border p-2 rounded bg-background" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
              <input placeholder="Penalty" className="w-full border p-2 rounded bg-background" value={formData.penalty} onChange={e => setFormData({...formData, penalty: e.target.value})} />
              <textarea placeholder="Description" className="w-full border p-2 rounded bg-background min-h-[100px]" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <div className="p-4 border-t border-border flex justify-end gap-2">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-md hover:bg-muted">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
