import React from 'react'
import { FileText, Download, Calendar, TrendingUp, Package, ChefHat, Users } from 'lucide-react'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'

const Reports = () => {
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

  const handleGenerateReport = (reportType) => {
    console.log('Generating report:', reportType)
    // TODO: Implement report generation logic
    alert(`Report generation for "${reportType}" will be implemented soon!`)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Reports</h1>
          <p className="text-muted-foreground">
            Generate detailed reports about your inventory, waste reduction, recipes, and household activity
          </p>
        </div>
        <Button variant="outline">
          <Calendar className="h-4 w-4 mr-2" />
          Schedule Reports
        </Button>
      </div>

      {/* Coming Soon Banner */}
      <Card className="p-6 bg-blue-500/5 border-blue-500/20">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">Reports System Coming Soon</h3>
            <p className="text-sm text-muted-foreground mb-3">
              We're building a comprehensive reporting system that will allow you to generate, schedule, and export detailed reports about all aspects of your food management.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400">
                PDF Export
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400">
                Excel/CSV
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400">
                Email Scheduling
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400">
                Custom Date Ranges
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400">
                Visual Charts
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Report Categories */}
      {reportCategories.map((category, index) => {
        const IconComponent = category.icon
        return (
          <div key={index}>
            <div className="flex items-center gap-2 mb-4">
              <IconComponent className={`h-5 w-5 ${category.color}`} />
              <h2 className="text-xl font-semibold">{category.title}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {category.reports.map((report, reportIndex) => (
                <Card key={reportIndex} className="p-4 hover:shadow-md transition-shadow">
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

      {/* Quick Stats Preview */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Report Preview</h3>
        <p className="text-sm text-muted-foreground mb-4">
          When reports are generated, you'll see previews here before downloading
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">0</div>
            <div className="text-xs text-muted-foreground mt-1">Reports Generated</div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">0</div>
            <div className="text-xs text-muted-foreground mt-1">Scheduled Reports</div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">0</div>
            <div className="text-xs text-muted-foreground mt-1">Reports Exported</div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default Reports

