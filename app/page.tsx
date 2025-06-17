"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, Save, AlertCircle, Wifi, WifiOff, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

interface Category {
  id: number
  name: string
  created_at?: string
  updated_at?: string
}

// Replace with your Laravel API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

// Mock data for demo mode
const MOCK_CATEGORIES: Category[] = [
  { id: 1, name: "Technology", created_at: "2024-01-01", updated_at: "2024-01-01" },
  { id: 2, name: "Business", created_at: "2024-01-02", updated_at: "2024-01-02" },
  { id: 3, name: "Education", created_at: "2024-01-03", updated_at: "2024-01-03" },
  { id: 4, name: "Health", created_at: "2024-01-04", updated_at: "2024-01-04" },
]

// Component to highlight search terms in text
function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) {
    return <span>{text}</span>
  }

  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")
  const parts = text.split(regex)

  return (
    <span>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </span>
  )
}

export default function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [editCategoryName, setEditCategoryName] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [nextId, setNextId] = useState(5) // For demo mode ID generation
  const { toast } = useToast()

  const [bulkCategoryNames, setBulkCategoryNames] = useState("")
  const [isBulkAddDialogOpen, setIsBulkAddDialogOpen] = useState(false)
  const [bulkAddProgress, setBulkAddProgress] = useState<{
    total: number
    completed: number
    failed: string[]
    isProcessing: boolean
  }>({ total: 0, completed: 0, failed: [], isProcessing: false })

  const [searchTerm, setSearchTerm] = useState("")

  // Filter categories based on search term
  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Check if API is accessible
  const checkApiConnection = async (): Promise<boolean> => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

      const response = await fetch(`${API_BASE_URL}/categories`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      return response.ok
    } catch (error) {
      console.log("API connection failed:", error)
      return false
    }
  }

  // Fetch categories from Laravel API or use mock data
  const fetchCategories = async () => {
    try {
      setLoading(true)
      setApiError(null)

      const isApiAccessible = await checkApiConnection()

      if (!isApiAccessible) {
        // Switch to demo mode
        setIsDemoMode(true)
        setCategories([...MOCK_CATEGORIES])
        setApiError("Cannot connect to Laravel API. Running in demo mode with sample data.")
        toast({
          title: "Demo Mode",
          description: "Using sample data. Configure your Laravel API URL to connect to real data.",
        })
        return
      }

      // API is accessible, fetch real data
      setIsDemoMode(false)
      const response = await fetch(`${API_BASE_URL}/categories`, {
        headers: {
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setCategories(data.data || data) // Handle both paginated and direct array responses
    } catch (error) {
      console.error("Error fetching categories:", error)
      setIsDemoMode(true)
      setCategories([...MOCK_CATEGORIES])
      setApiError(`API Error: ${error instanceof Error ? error.message : "Unknown error"}. Running in demo mode.`)

      toast({
        title: "Connection Error",
        description: "Switched to demo mode. Check your Laravel API configuration.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Create new category (demo mode or API)
  const addCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Error",
        description: "Category name is required.",
        variant: "destructive",
      })
      return
    }

    try {
      if (isDemoMode) {
        // Demo mode - add to local state
        const newCategory: Category = {
          id: nextId,
          name: newCategoryName.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setCategories([...categories, newCategory])
        setNextId(nextId + 1)
        setNewCategoryName("")
        setIsAddDialogOpen(false)
        toast({
          title: "Success (Demo)",
          description: "Category created in demo mode.",
        })
        return
      }

      // API mode
      const response = await fetch(`${API_BASE_URL}/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const newCategory = await response.json()
      setCategories([...categories, newCategory.data || newCategory])
      setNewCategoryName("")
      setIsAddDialogOpen(false)
      toast({
        title: "Success",
        description: "Category created successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to create category: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
      console.error("Error creating category:", error)
    }
  }

  // Update category (demo mode or API)
  const updateCategory = async () => {
    if (!editingCategory || !editCategoryName.trim()) {
      toast({
        title: "Error",
        description: "Category name is required.",
        variant: "destructive",
      })
      return
    }

    try {
      if (isDemoMode) {
        // Demo mode - update local state
        setCategories(
          categories.map((cat) =>
            cat.id === editingCategory.id
              ? { ...cat, name: editCategoryName.trim(), updated_at: new Date().toISOString() }
              : cat,
          ),
        )
        setEditingCategory(null)
        setEditCategoryName("")
        setIsEditDialogOpen(false)
        toast({
          title: "Success (Demo)",
          description: "Category updated in demo mode.",
        })
        return
      }

      // API mode
      const response = await fetch(`${API_BASE_URL}/categories/${editingCategory.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ name: editCategoryName.trim() }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      setCategories(
        categories.map((cat) => (cat.id === editingCategory.id ? { ...cat, name: editCategoryName.trim() } : cat)),
      )
      setEditingCategory(null)
      setEditCategoryName("")
      setIsEditDialogOpen(false)
      toast({
        title: "Success",
        description: "Category updated successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to update category: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
      console.error("Error updating category:", error)
    }
  }

  // Add multiple categories at once
  const addMultipleCategories = async () => {
    const categoryNames = bulkCategoryNames
      .split("\n")
      .map((name) => name.trim())
      .filter((name) => name.length > 0)
      .filter((name, index, arr) => arr.indexOf(name) === index) // Remove duplicates

    if (categoryNames.length === 0) {
      toast({
        title: "Error",
        description: "Please enter at least one category name.",
        variant: "destructive",
      })
      return
    }

    setBulkAddProgress({
      total: categoryNames.length,
      completed: 0,
      failed: [],
      isProcessing: true,
    })

    const failedCategories: string[] = []
    let completedCount = 0

    try {
      if (isDemoMode) {
        // Demo mode - add all to local state
        const newCategories: Category[] = categoryNames.map((name, index) => ({
          id: nextId + index,
          name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))

        setCategories([...categories, ...newCategories])
        setNextId(nextId + categoryNames.length)
        completedCount = categoryNames.length

        toast({
          title: "Success (Demo)",
          description: `${completedCount} categories created in demo mode.`,
        })
      } else {
        // API mode - create categories one by one
        for (const categoryName of categoryNames) {
          try {
            const response = await fetch(`${API_BASE_URL}/categories`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({ name: categoryName }),
            })

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`)
            }

            const newCategory = await response.json()
            setCategories((prev) => [...prev, newCategory.data || newCategory])
            completedCount++
          } catch (error) {
            console.error(`Error creating category "${categoryName}":`, error)
            failedCategories.push(categoryName)
          }

          setBulkAddProgress((prev) => ({
            ...prev,
            completed: completedCount,
            failed: failedCategories,
          }))
        }

        // Show final result
        if (failedCategories.length === 0) {
          toast({
            title: "Success",
            description: `All ${completedCount} categories created successfully.`,
          })
        } else {
          toast({
            title: "Partial Success",
            description: `${completedCount} categories created, ${failedCategories.length} failed.`,
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to create categories: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
    } finally {
      setBulkAddProgress((prev) => ({ ...prev, isProcessing: false }))

      // Close dialog and reset form after a short delay if all succeeded
      if (failedCategories.length === 0) {
        setTimeout(() => {
          setBulkCategoryNames("")
          setIsBulkAddDialogOpen(false)
          setBulkAddProgress({ total: 0, completed: 0, failed: [], isProcessing: false })
        }, 1500)
      }
    }
  }

  // Delete category (demo mode or API)
  const deleteCategory = async (id: number) => {
    if (!confirm("Are you sure you want to delete this category?")) {
      return
    }

    try {
      if (isDemoMode) {
        // Demo mode - remove from local state
        setCategories(categories.filter((cat) => cat.id !== id))
        toast({
          title: "Success (Demo)",
          description: "Category deleted in demo mode.",
        })
        return
      }

      // API mode
      const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      setCategories(categories.filter((cat) => cat.id !== id))
      toast({
        title: "Success",
        description: "Category deleted successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete category: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
      console.error("Error deleting category:", error)
    }
  }

  // Start editing category
  const startEdit = (category: Category) => {
    setEditingCategory(category)
    setEditCategoryName(category.name)
    setIsEditDialogOpen(true)
  }

  // Retry API connection
  const retryConnection = () => {
    fetchCategories()
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Connection Status Alert */}
      {apiError && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="flex items-center gap-2">
            Connection Status
            {isDemoMode ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
          </AlertTitle>
          <AlertDescription className="mt-2">
            {apiError}
            <div className="mt-2">
              <Button variant="outline" size="sm" onClick={retryConnection}>
                Retry Connection
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                Category Management
                {isDemoMode && <Badge variant="secondary">Demo Mode</Badge>}
              </CardTitle>
              <CardDescription>
                {isDemoMode
                  ? "Managing sample categories (changes won't be saved)"
                  : "Manage your application categories"}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Category</DialogTitle>
                    <DialogDescription>Enter the name for the new category.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Name
                      </Label>
                      <Input
                        id="name"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="col-span-3"
                        placeholder="Enter category name"
                        onKeyPress={(e) => e.key === "Enter" && addCategory()}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={addCategory}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Category
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isBulkAddDialogOpen} onOpenChange={setIsBulkAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Multiple
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Multiple Categories</DialogTitle>
                    <DialogDescription>
                      Enter category names, one per line. Duplicate names will be automatically removed.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="bulk-names">Category Names</Label>
                      <textarea
                        id="bulk-names"
                        value={bulkCategoryNames}
                        onChange={(e) => setBulkCategoryNames(e.target.value)}
                        className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                        placeholder="Technology&#10;Business&#10;Education&#10;Health"
                        disabled={bulkAddProgress.isProcessing}
                      />
                      <div className="text-xs text-muted-foreground">
                        {bulkCategoryNames.split("\n").filter((name) => name.trim().length > 0).length} categories to
                        add
                      </div>
                    </div>

                    {bulkAddProgress.isProcessing && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress:</span>
                          <span>
                            {bulkAddProgress.completed} / {bulkAddProgress.total}
                          </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(bulkAddProgress.completed / bulkAddProgress.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {bulkAddProgress.failed.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-destructive">Failed to create:</div>
                        <div className="text-xs text-muted-foreground max-h-20 overflow-y-auto">
                          {bulkAddProgress.failed.join(", ")}
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsBulkAddDialogOpen(false)
                        setBulkCategoryNames("")
                        setBulkAddProgress({ total: 0, completed: 0, failed: [], isProcessing: false })
                      }}
                      disabled={bulkAddProgress.isProcessing}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={addMultipleCategories}
                      disabled={bulkAddProgress.isProcessing || bulkCategoryNames.trim().length === 0}
                    >
                      {bulkAddProgress.isProcessing ? (
                        <>Processing...</>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Create Categories
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {searchTerm && (
              <div className="mt-2 text-sm text-muted-foreground">
                {filteredCategories.length === 0
                  ? "No categories found"
                  : `${filteredCategories.length} of ${categories.length} categories`}
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading categories...</div>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-4">No categories found</div>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Category
              </Button>
            </div>
          ) : filteredCategories.length === 0 && searchTerm ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-4">No categories match "{searchTerm}"</div>
              <Button variant="outline" onClick={() => setSearchTerm("")}>
                Clear Search
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.id}</TableCell>
                      <TableCell>
                        {searchTerm ? <HighlightedText text={category.name} highlight={searchTerm} /> : category.name}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => startEdit(category)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteCategory(category.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update the category name.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                className="col-span-3"
                placeholder="Enter category name"
                onKeyPress={(e) => e.key === "Enter" && updateCategory()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={updateCategory}>
              <Save className="w-4 h-4 mr-2" />
              Update Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  )
}
