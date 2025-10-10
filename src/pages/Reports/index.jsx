import React, { useState, useEffect } from 'react'
import { FileText, Download, Calendar, TrendingUp, Package, ChefHat, Users, FileSpreadsheet, FileJson } from 'lucide-react'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { useAuth } from '../../contexts/AuthContext'
import { useHousehold } from '../../contexts/HouseholdContext'
import { supabase } from '../../lib/supabaseClient'

const Reports = () => {
  const { user } = useAuth()
  const { currentHousehold, isPersonal } = useHousehold()
  const [exportCounts, setExportCounts] = useState({
    generated: 0,
    scheduled: 0,
    exported: 0
  })

  // Quick Export Section
  const quickExports = [
    {
      type: 'inventory',
      title: 'Inventory Data',
      description: 'Export all your food items and inventory history',
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10'
    },
    {
      type: 'analytics',
      title: 'Analytics Data',
      description: 'Export your waste reduction and consumption analytics',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-500/10'
    },
    {
      type: 'recipes',
      title: 'Recipe History',
      description: 'Export your saved recipes and favorites',
      icon: ChefHat,
      color: 'text-orange-600',
      bgColor: 'bg-orange-500/10'
    }
  ]

  const reportCategories = [
    {
      title: 'Inventory Reports',
      icon: Package,
      color: 'text-blue-600',
      reports: [
        { name: 'Current Inventory Summary', description: 'Complete overview of all items in stock', type: 'inventory_summary' },
        { name: 'Expiring Items Report', description: 'Items expiring in the next 7 days', type: 'expiring_items' },
        { name: 'Low Stock Alert', description: 'Items below minimum quantity threshold', type: 'low_stock' },
        { name: 'Storage Location Analysis', description: 'Breakdown by storage location', type: 'storage_analysis' }
      ]
    },
    {
      title: 'Waste & Consumption',
      icon: TrendingUp,
      color: 'text-green-600',
      reports: [
        { name: 'Monthly Waste Report', description: 'Food waste statistics for the past month', type: 'waste_monthly' },
        { name: 'Consumption Trends', description: 'Analysis of consumption patterns', type: 'consumption_trends' },
        { name: 'Waste by Category', description: 'Food waste breakdown by category', type: 'waste_category' },
        { name: 'Year-over-Year Comparison', description: 'Compare waste reduction progress', type: 'yoy_comparison' }
      ]
    },
    {
      title: 'Recipe Reports',
      icon: ChefHat,
      color: 'text-orange-600',
      reports: [
        { name: 'Most Used Recipes', description: 'Your top 10 frequently used recipes', type: 'top_recipes' },
        { name: 'Recipe Efficiency', description: 'Recipes that helped reduce waste', type: 'recipe_efficiency' },
        { name: 'Ingredient Usage', description: 'Most commonly used ingredients', type: 'ingredient_usage' },
        { name: 'Seasonal Recipe Trends', description: 'Recipe usage by season', type: 'seasonal_recipes' }
      ]
    },
    {
      title: 'Household Reports',
      icon: Users,
      color: 'text-purple-600',
      reports: [
        { name: 'Member Activity', description: 'Individual household member contributions', type: 'member_activity' },
        { name: 'Shared vs Personal Items', description: 'Breakdown of item ownership', type: 'shared_personal' },
        { name: 'Household Goals Progress', description: 'Track collective goal achievements', type: 'goals_progress' },
        { name: 'Collaboration Report', description: 'How well the household works together', type: 'collaboration' }
      ]
    }
  ]

  // Export inventory data
  const exportInventory = async () => {
    try {
      let query = supabase
        .from('pantry_items')
        .select('*')
        .eq('user_id', user.id)

      if (isPersonal) {
        query = query.is('household_id', null)
      } else if (currentHousehold?.id) {
        query = query.eq('household_id', currentHousehold.id)
      }

      const { data: items, error } = await query

      if (error) throw error

      // Convert to CSV
      const csvData = convertToCSV(items, [
        'id', 'name', 'quantity', 'unit', 'category', 'expiry_date',
        'storage_location_id', 'created_at', 'updated_at'
      ])

      downloadFile(csvData, `inventory_export_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv')

      setExportCounts(prev => ({ ...prev, exported: prev.exported + 1 }))
      alert('✓ Inventory data exported successfully!')
    } catch (error) {
      console.error('Error exporting inventory:', error)
      alert('Failed to export inventory data. Please try again.')
    }
  }

  // Export analytics data
  const exportAnalytics = async () => {
    try {
      let query = supabase
        .from('pantry_events')
        .select('*')
        .eq('user_id', user.id)

      if (!isPersonal && currentHousehold?.id) {
        query = query.eq('household_id', currentHousehold.id)
      }

      const { data: events, error } = await query

      if (error) throw error

      // Calculate analytics
      const consumed = events?.filter(e => e.type === 'consumed') || []
      const wasted = events?.filter(e => e.type === 'wasted') || []

      const analyticsData = {
        summary: {
          total_events: events?.length || 0,
          consumed_count: consumed.length,
          wasted_count: wasted.length,
          waste_rate: events?.length > 0 ? ((wasted.length / events.length) * 100).toFixed(2) + '%' : '0%'
        },
        events: events || []
      }

      // Convert to JSON for download
      const jsonData = JSON.stringify(analyticsData, null, 2)
      downloadFile(jsonData, `analytics_export_${new Date().toISOString().split('T')[0]}.json`, 'application/json')

      setExportCounts(prev => ({ ...prev, exported: prev.exported + 1 }))
      alert('✓ Analytics data exported successfully!')
    } catch (error) {
      console.error('Error exporting analytics:', error)
      alert('Failed to export analytics data. Please try again.')
    }
  }

  // Export recipes data
  const exportRecipes = async () => {
    try {
      const { data: recipes, error } = await supabase
        .from('ai_saved_recipes')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error

      // Convert to CSV
      const csvData = convertToCSV(recipes || [], [
        'id', 'title', 'description', 'cook_time', 'servings',
        'difficulty', 'created_at'
      ])

      downloadFile(csvData, `recipes_export_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv')

      setExportCounts(prev => ({ ...prev, exported: prev.exported + 1 }))
      alert('✓ Recipe history exported successfully!')
    } catch (error) {
      console.error('Error exporting recipes:', error)
      alert('Failed to export recipe data. Please try again.')
    }
  }

  // Handle quick export
  const handleQuickExport = async (type) => {
    switch (type) {
      case 'inventory':
        await exportInventory()
        break
      case 'analytics':
        await exportAnalytics()
        break
      case 'recipes':
        await exportRecipes()
        break
      default:
        console.log('Unknown export type:', type)
    }
  }

  // Handle detailed report generation
  const handleGenerateReport = (reportType) => {
    console.log('Generating report:', reportType)
    alert(`Detailed report generation for "${reportType}" is coming soon! For now, use the Quick Export feature above to download raw data.`)
    setExportCounts(prev => ({ ...prev, generated: prev.generated + 1 }))
  }

  // Utility: Convert array of objects to CSV
  const convertToCSV = (data, headers) => {
    if (!data || data.length === 0) return 'No data available'

    const csvRows = []

    // Add headers
    csvRows.push(headers.join(','))

    // Add data rows
    data.forEach(item => {
      const values = headers.map(header => {
        const value = item[header]
        // Handle values with commas or quotes
        if (value === null || value === undefined) return ''
        const escaped = ('' + value).replace(/"/g, '""')
        return `"${escaped}"`
      })
      csvRows.push(values.join(','))
    })

    return csvRows.join('\n')
  }

  // Utility: Download file
  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports & Data Export</h1>
          <p className="text-muted-foreground mt-2">
            Generate reports and export your data in various formats
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isPersonal && currentHousehold && (
            <Badge variant="outline" className="text-sm flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-orange-500"></span>
              {currentHousehold.name}
            </Badge>
          )}
          {isPersonal && (
            <Badge variant="outline" className="text-sm flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
              Personal
            </Badge>
          )}
        </div>
      </div>

      {/* Quick Export Section */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-1">Quick Data Exports</h2>
          <p className="text-sm text-muted-foreground">
            Download your data instantly in CSV/JSON format
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickExports.map((exportItem) => {
            const IconComponent = exportItem.icon
            return (
              <Card key={exportItem.type} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg ${exportItem.bgColor}`}>
                    <IconComponent className={`h-6 w-6 ${exportItem.color}`} />
                  </div>
                </div>
                <h3 className="font-semibold mb-2">{exportItem.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {exportItem.description}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleQuickExport(exportItem.type)}
                  >
                    <FileSpreadsheet className="h-3 w-3 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Detailed Reports Coming Soon */}
      <Card className="p-6 bg-blue-500/5 border-blue-500/20">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">Advanced Reports Coming Soon</h3>
            <p className="text-sm text-muted-foreground mb-3">
              We're building detailed PDF reports with charts, insights, and scheduling capabilities. Use Quick Exports above for immediate data access.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400">
                PDF Reports
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400">
                Visual Charts
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400">
                Email Scheduling
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400">
                Custom Date Ranges
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Report Categories (Preview) */}
      {reportCategories.map((category, index) => {
        const IconComponent = category.icon
        return (
          <div key={index}>
            <div className="flex items-center gap-2 mb-4">
              <IconComponent className={`h-5 w-5 ${category.color}`} />
              <h2 className="text-xl font-semibold">{category.title}</h2>
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                Coming Soon
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {category.reports.map((report, reportIndex) => (
                <Card key={reportIndex} className="p-4 opacity-75">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{report.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {report.description}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateReport(report.type)}
                      >
                        <Download className="h-3 w-3 mr-2" />
                        Generate Report
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )
      })}

      {/* Export Stats */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Export Activity</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{exportCounts.exported}</div>
            <div className="text-xs text-muted-foreground mt-1">Files Exported This Session</div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">{exportCounts.generated}</div>
            <div className="text-xs text-muted-foreground mt-1">Reports Generated</div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">{exportCounts.scheduled}</div>
            <div className="text-xs text-muted-foreground mt-1">Scheduled Reports</div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default Reports
