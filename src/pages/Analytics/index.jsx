import React from 'react'
import KPICards from '../../components/KPICards'
import AdvancedChart from '../../components/AdvancedChartRecharts'
import PieChart from '../../components/PieChart'
import PieChart2 from '../../components/PieChart2'
import BarChart from '../../components/BarChart'
import BarChart2 from '../../components/BarChart2'

const Analytics = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Comprehensive insights into your pantry and food waste patterns
        </p>
      </div>

      {/* KPI Cards */}
      <KPICards />

      {/* Advanced Chart */}
      <div className="mb-8">
        <AdvancedChart />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <PieChart />
        <PieChart2 />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <BarChart />
        <BarChart2 />
      </div>
    </div>
  )
}

export default Analytics
