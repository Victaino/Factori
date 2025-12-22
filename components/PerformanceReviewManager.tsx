
import React, { useState, useEffect, useMemo } from 'react';
import { db, PERFORMANCE_SQL } from '../services/db';
import { Employee, PerformanceReview } from '../types';
import { Award, Plus, Trash2, Pencil, Search, X, Calendar, Star, TrendingUp, AlertTriangle, Terminal, Copy, User } from 'lucide-react';

export const PerformanceReviewManager: React.FC = () => {
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  // State for error handling (missing table)
  const [dbError, setDbError] = useState<{message: string, sql?: string} | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [revs, emps] = await Promise.all([
            db.getPerformanceReviews(),
            db.getEmployees()
        ]);
        setReviews(revs);
        setEmployees(emps);
      } catch (err: any) {
          console.error("Failed to load reviews", err);
          if (err.message.includes('relation "performance_reviews" does not exist') || err.message.includes('404')) {
              setDbError({
                  message: "The Performance Reviews table is missing from your database.",
                  sql: PERFORMANCE_SQL
              });
          }
      }
    };
    fetchData();
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    employeeId: '',
    reviewDate: new Date().toISOString().split('T')[0],
    reviewer: '',
    rating: 3,
    strengths: '',
    improvements: '',
    goals: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDbError(null);
    try {
        if (editingId) {
            await db.updatePerformanceReview(editingId, formData);
            setReviews(reviews.map(r => r.id === editingId ? { ...r, ...formData } : r));
        } else {
            const added = await db.addPerformanceReview(formData);
            setReviews([added, ...reviews]);
        }
        setIsModalOpen(false);
        resetForm();
    } catch (err: any) {
        console.error("Save failed:", err);
        setDbError({ message: err.message || "Failed to save review", sql: err.message.includes("relation") ? PERFORMANCE_SQL : undefined });
    }
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      reviewDate: new Date().toISOString().split('T')[0],
      reviewer: '',
      rating: 3,
      strengths: '',
      improvements: '',
      goals: ''
    });
    setEditingId(null);
  };

  const handleEdit = (review: PerformanceReview) => {
    setFormData({
      employeeId: review.employeeId,
      reviewDate: review.reviewDate,
      reviewer: review.reviewer,
      rating: review.rating,
      strengths: review.strengths,
      improvements: review.improvements,
      goals: review.goals
    });
    setEditingId(review.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this performance review?')) {
      await db.deletePerformanceReview(id);
      setReviews(reviews.filter(r => r.id !== id));
    }
  };

  const getEmployeeName = (id: string) => {
      const emp = employees.find(e => e.id === id);
      return emp ? emp.name : 'Unknown Employee';
  };

  const getEmployeeRole = (id: string) => {
      const emp = employees.find(e => e.id === id);
      return emp ? emp.position : '';
  };

  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      const empName = getEmployeeName(r.employeeId).toLowerCase();
      const reviewer = r.reviewer.toLowerCase();
      const term = searchTerm.toLowerCase();
      return empName.includes(term) || reviewer.includes(term);
    });
  }, [reviews, searchTerm, employees]);

  const renderStars = (rating: number) => {
      return (
          <div className="flex text-yellow-400">
              {[1, 2, 3, 4, 5].map(star => (
                  <Star key={star} size={16} fill={star <= rating ? "currentColor" : "none"} stroke="currentColor" className={star <= rating ? "" : "text-gray-300"} />
              ))}
          </div>
      );
  };

  const getRatingColor = (rating: number) => {
      if (rating >= 4) return 'bg-green-100 text-green-700 border-green-200';
      if (rating >= 3) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      return 'bg-red-100 text-red-700 border-red-200';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Award className="text-purple-600" /> Performance Reviews
        </h2>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700"
        >
          <Plus size={20} /> Add Review
        </button>
      </div>

      {dbError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
                <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                    <h3 className="font-bold text-red-800">Configuration Required</h3>
                    <p className="text-sm text-red-700 mt-1">{dbError.message}</p>
                    
                    {dbError.sql && (
                        <div className="mt-3 bg-gray-900 rounded-lg p-3 overflow-hidden">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-gray-400 flex items-center gap-1"><Terminal size={12}/> SQL Fix</span>
                                <button 
                                onClick={() => navigator.clipboard.writeText(dbError.sql!)}
                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                >
                                    <Copy size={12} /> Copy
                                </button>
                            </div>
                            <code className="text-xs font-mono text-green-400 block break-all">
                                {dbError.sql}
                            </code>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text" 
          placeholder="Search by employee or reviewer..." 
          className="w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredReviews.map(review => (
          <div key={review.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                            <User size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800">{getEmployeeName(review.employeeId)}</h3>
                            <p className="text-xs text-gray-500">{getEmployeeRole(review.employeeId)}</p>
                        </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full border flex items-center gap-1 ${getRatingColor(review.rating)}`}>
                        <span className="font-bold">{review.rating}</span>
                        <Star size={12} fill="currentColor" />
                    </div>
                </div>

                <div className="space-y-3 text-sm">
                    {review.strengths && (
                        <div>
                            <p className="font-semibold text-green-700 flex items-center gap-1 mb-1"><TrendingUp size={14}/> Strengths</p>
                            <p className="text-gray-600 bg-green-50 p-2 rounded border border-green-100">{review.strengths}</p>
                        </div>
                    )}
                    {review.improvements && (
                        <div>
                            <p className="font-semibold text-orange-700 flex items-center gap-1 mb-1"><AlertTriangle size={14}/> Improvements</p>
                            <p className="text-gray-600 bg-orange-50 p-2 rounded border border-orange-100">{review.improvements}</p>
                        </div>
                    )}
                    {review.goals && (
                        <div>
                            <p className="font-semibold text-blue-700 flex items-center gap-1 mb-1"><Award size={14}/> Goals</p>
                            <p className="text-gray-600 bg-blue-50 p-2 rounded border border-blue-100">{review.goals}</p>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-3 border-t flex justify-between items-center text-xs text-gray-500">
                <div className="flex gap-4">
                    <span className="flex items-center gap-1"><Calendar size={12}/> {review.reviewDate}</span>
                    <span className="flex items-center gap-1"><User size={12}/> Rev: {review.reviewer}</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => handleEdit(review)} className="text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(review.id)} className="text-red-600 hover:underline">Delete</button>
                </div>
            </div>
          </div>
        ))}
        {filteredReviews.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            <p>{reviews.length === 0 ? "No performance reviews added yet." : "No reviews match your search."}</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingId ? 'Edit Review' : 'New Performance Review'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                    <select required className="w-full border rounded-lg p-2"
                        value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})}>
                        <option value="">Select Employee</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.name} - {e.position}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Review Date</label>
                    <input required type="date" className="w-full border rounded-lg p-2" 
                        value={formData.reviewDate} onChange={e => setFormData({...formData, reviewDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reviewer Name</label>
                    <input required type="text" className="w-full border rounded-lg p-2" 
                        placeholder="e.g. HR Manager"
                        value={formData.reviewer} onChange={e => setFormData({...formData, reviewer: e.target.value})} />
                  </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Overall Rating (1-5)</label>
                <div className="flex gap-4 items-center">
                    <input 
                        type="range" min="1" max="5" step="0.5"
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                        value={formData.rating} 
                        onChange={e => setFormData({...formData, rating: parseFloat(e.target.value)})} 
                    />
                    <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-lg">
                        <span className="font-bold text-lg text-gray-800">{formData.rating}</span>
                        <Star size={16} fill="gold" className="text-yellow-400"/>
                    </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Key Strengths</label>
                <textarea className="w-full border rounded-lg p-2 h-20" 
                    placeholder="What is the employee doing well?"
                    value={formData.strengths} onChange={e => setFormData({...formData, strengths: e.target.value})} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Areas for Improvement</label>
                <textarea className="w-full border rounded-lg p-2 h-20" 
                    placeholder="Where can they improve?"
                    value={formData.improvements} onChange={e => setFormData({...formData, improvements: e.target.value})} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Goals for Next Period</label>
                <textarea className="w-full border rounded-lg p-2 h-20" 
                    placeholder="Set 1-3 clear goals..."
                    value={formData.goals} onChange={e => setFormData({...formData, goals: e.target.value})} />
              </div>

              <button type="submit" className="w-full bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700 mt-2">
                {editingId ? 'Update Review' : 'Save Review'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
