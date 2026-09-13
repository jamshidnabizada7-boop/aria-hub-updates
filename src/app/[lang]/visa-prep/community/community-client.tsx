"use client";

import React, { useState, useEffect, startTransition } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Heart, Search, Calendar, MapPin, Award } from 'lucide-react';
import { toast } from 'sonner';

interface Story {
  id: string;
  title: string;
  country: string;
  visaType: string;
  year: number;
  content: string;
  likes: number;
  authorAlias: string | null;
  createdAt: Date;
}

export function CommunityClient({ initialStories }: { initialStories: Story[] }) {
  const [stories, setStories] = useState<Story[]>(initialStories);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCountry, setFilterCountry] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [votedStories, setVotedStories] = useState<string[]>([]);

  // Load votes from local storage
  useEffect(() => {
    const saved = localStorage.getItem('visa_story_votes');
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        startTransition(() => setVotedStories(parsed as string[]));
      }
    }
  }, []);

  const handleVote = async (id: string) => {
    if (votedStories.includes(id)) {
      toast.error('You have already voted for this story!');
      return;
    }

    // Optimistic update
    setStories(prev => prev.map(s => s.id === id ? { ...s, likes: s.likes + 1 } : s));
    const newVoted = [...votedStories, id];
    setVotedStories(newVoted);
    localStorage.setItem('visa_story_votes', JSON.stringify(newVoted));

    try {
      await fetch(`/api/visa-prep/stories/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      toast.success('Thank you for your feedback!');
    } catch (e) {
      // Revert if failed
      setStories(prev => prev.map(s => s.id === id ? { ...s, likes: s.likes - 1 } : s));
      setVotedStories(votedStories.filter(vId => vId !== id));
      localStorage.setItem('visa_story_votes', JSON.stringify(votedStories.filter(vId => vId !== id)));
      toast.error('Failed to save your vote. Please try again.');
    }
  };

  const countries = Array.from(new Set(initialStories.map(s => s.country))).sort();
  const visaTypes = Array.from(new Set(initialStories.map(s => s.visaType))).sort();

  const filteredStories = stories.filter(story => {
    const matchesSearch = story.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          story.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCountry = filterCountry === 'all' || story.country === filterCountry;
    const matchesType = filterType === 'all' || story.visaType === filterType;
    return matchesSearch && matchesCountry && matchesType;
  });

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search stories..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <Select value={filterCountry} onValueChange={setFilterCountry}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="All Countries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="All Visa Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Visa Types</SelectItem>
              {visaTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      {filteredStories.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-xl border border-dashed">
          <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No stories found</h3>
          <p className="text-muted-foreground">Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStories.map(story => (
            <Card key={story.id} className="flex flex-col h-full hover:shadow-lg transition-shadow duration-300 border-t-4 border-t-emerald-500 overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start gap-4 mb-2">
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200">
                    <MapPin className="mr-1 h-3 w-3" /> {story.country}
                  </Badge>
                  <Badge variant="secondary" className="font-mono">
                    {story.visaType}
                  </Badge>
                </div>
                <CardTitle className="text-xl leading-tight line-clamp-2">{story.title}</CardTitle>
                <div className="flex items-center text-xs text-muted-foreground mt-2">
                  <Calendar className="mr-1 h-3 w-3" /> {story.year} • {story.authorAlias || 'Anonymous'}
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-6 leading-relaxed whitespace-pre-wrap">
                  {story.content}
                </p>
              </CardContent>
              <CardFooter className="pt-4 border-t bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`gap-2 transition-colors ${votedStories.includes(story.id) ? 'text-rose-500 hover:text-rose-600 bg-rose-50 dark:bg-rose-950/50' : 'text-slate-500 hover:text-rose-500'}`}
                  onClick={() => handleVote(story.id)}
                  disabled={votedStories.includes(story.id)}
                >
                  <Heart className={`h-4 w-4 ${votedStories.includes(story.id) ? 'fill-rose-500' : ''}`} />
                  <span className="font-semibold">{story.likes}</span>
                  <span className="sr-only">Likes</span>
                </Button>
                <Button variant="link" size="sm" className="text-primary hover:underline">
                  Read Full Story
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
