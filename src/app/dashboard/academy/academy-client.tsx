'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { BookOpen, FileText, GraduationCap, ShieldCheck, Briefcase, Plus, Edit2, Search, Eye } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Article {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  category: string
  tags: string[]
  visible_to: string[]
  view_count: number
  updated_at: string
}

const categories = [
  { value: 'sop', label: 'SOPs', icon: ShieldCheck },
  { value: 'training', label: 'Training', icon: GraduationCap },
  { value: 'sales', label: 'Sales', icon: Briefcase },
  { value: 'technical', label: 'Technical', icon: FileText },
  { value: 'general', label: 'General', icon: BookOpen },
]

export default function AcademyClient({ isAdmin }: { isAdmin: boolean }) {
  const { toast } = useToast()
  const [articles, setArticles] = useState<Article[]>([])
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formCategory, setFormCategory] = useState('general')

  useEffect(() => {
    fetchArticles()
  }, [selectedCategory, searchQuery])

  const fetchArticles = async () => {
    try {
      let url = '/api/knowledge-base'
      const params = new URLSearchParams()
      if (selectedCategory) params.set('category', selectedCategory)
      if (searchQuery) params.set('search', searchQuery)
      if (params.toString()) url += `?${params.toString()}`
      
      const response = await fetch(url)
      const data = await response.json()
      setArticles(data.articles || [])
    } catch (error) {
      console.error('Failed to fetch articles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateArticle = async () => {
    if (!formTitle || !formContent) {
      toast({ title: 'Please fill all fields', variant: 'destructive' })
      return
    }

    try {
      const response = await fetch('/api/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle,
          content: formContent,
          category: formCategory,
        }),
      })

      if (!response.ok) throw new Error()

      toast({ title: 'Article created!' })
      setShowCreateDialog(false)
      setFormTitle('')
      setFormContent('')
      setFormCategory('general')
      fetchArticles()
    } catch (error) {
      toast({ title: 'Failed to create article', variant: 'destructive' })
    }
  }

  const handleUpdateArticle = async () => {
    if (!selectedArticle) return

    try {
      const response = await fetch(`/api/knowledge-base/${selectedArticle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle,
          content: formContent,
          category: formCategory,
        }),
      })

      if (!response.ok) throw new Error()

      toast({ title: 'Article updated!' })
      setIsEditing(false)
      fetchArticles()
      
      // Update selected article
      setSelectedArticle({
        ...selectedArticle,
        title: formTitle,
        content: formContent,
        category: formCategory,
      })
    } catch (error) {
      toast({ title: 'Failed to update article', variant: 'destructive' })
    }
  }

  const openArticle = (article: Article) => {
    setSelectedArticle(article)
    setFormTitle(article.title)
    setFormContent(article.content)
    setFormCategory(article.category)
    setIsEditing(false)
  }

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.value === category)
    return cat ? cat.icon : BookOpen
  }

  const filteredArticles = articles

  return (
    <div className="grid grid-cols-12 gap-6 min-h-[600px]">
      {/* Sidebar */}
      <div className="col-span-12 lg:col-span-3">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg">Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant={selectedCategory === null ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setSelectedCategory(null)}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              All Articles
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.value}
                variant={selectedCategory === cat.value ? 'secondary' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setSelectedCategory(cat.value)}
              >
                <cat.icon className="w-4 h-4 mr-2" />
                {cat.label}
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Search */}
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-zinc-900 border-zinc-800"
            />
          </div>
        </div>

        {/* Create Button */}
        {isAdmin && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="w-full mt-4 bg-primary hover:bg-primary/90 text-black">
                <Plus className="w-4 h-4 mr-2" />
                New Article
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-white">Create Article</DialogTitle>
                <DialogDescription>Add a new article to the playbook</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Refund Policy SOP"
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="content">Content (Markdown)</Label>
                  <Textarea
                    id="content"
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="# Refund Policy&#10;&#10;No refunds unless..."
                    className="bg-zinc-800 border-zinc-700 min-h-[300px] font-mono text-sm"
                  />
                </div>
                <Button onClick={handleCreateArticle} className="bg-primary hover:bg-primary/90 text-black">
                  Create Article
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Article List */}
      <div className="col-span-12 lg:col-span-4">
        <Card className="bg-zinc-900 border-zinc-800 h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg">
              {selectedCategory ? categories.find(c => c.value === selectedCategory)?.label : 'All Articles'}
            </CardTitle>
            <CardDescription>{filteredArticles.length} articles</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-2">
                {filteredArticles.map((article) => {
                  const CategoryIcon = getCategoryIcon(article.category)
                  return (
                    <div
                      key={article.id}
                      onClick={() => openArticle(article)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedArticle?.id === article.id
                          ? 'bg-primary/10 border border-primary/30'
                          : 'bg-zinc-800/50 hover:bg-zinc-800 border border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <CategoryIcon className="w-4 h-4 text-primary mt-1" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-white truncate">{article.title}</h4>
                          <p className="text-xs text-zinc-500 line-clamp-2 mt-1">
                            {article.excerpt}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs capitalize">
                              {article.category}
                            </Badge>
                            <span className="text-xs text-zinc-600 flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {article.view_count}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                
                {filteredArticles.length === 0 && !loading && (
                  <div className="text-center py-8 text-zinc-500">
                    No articles found
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Article Reader */}
      <div className="col-span-12 lg:col-span-5">
        <Card className="bg-zinc-900 border-zinc-800 h-full">
          {selectedArticle ? (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">{selectedArticle.title}</CardTitle>
                    <CardDescription>
                      Last updated: {new Date(selectedArticle.updated_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      {isEditing ? 'Cancel' : 'Edit'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-title">Title</Label>
                      <Input
                        id="edit-title"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        className="bg-zinc-800 border-zinc-700"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-content">Content</Label>
                      <Textarea
                        id="edit-content"
                        value={formContent}
                        onChange={(e) => setFormContent(e.target.value)}
                        className="bg-zinc-800 border-zinc-700 min-h-[400px] font-mono text-sm"
                      />
                    </div>
                    <Button onClick={handleUpdateArticle} className="bg-primary hover:bg-primary/90 text-black">
                      Save Changes
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="prose prose-invert prose-zinc max-w-none">
                      <div className="whitespace-pre-wrap text-zinc-300">
                        {selectedArticle.content}
                      </div>
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-zinc-500">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Select an article to read</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
