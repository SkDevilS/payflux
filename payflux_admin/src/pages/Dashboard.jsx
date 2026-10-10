import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  TrendingUp, TrendingDown, DollarSign, 
  ArrowUpCircle, ArrowDownCircle, Clock, RefreshCw, Activity 
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import adminAPI from '@/api/admin_api'
import { toast } from 'sonner'

const StatCard = ({ title, amount, trend, icon: Icon, color }) => (
  <Card className="hover:shadow-lg transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
      <Icon className={`h-5 w-5 ${color}`} />
    </CardHeader>
    <CardContent>
      <div className="text-xl sm:text-2xl font-bold truncate" title={formatCurrency(amount)}>
        {formatCurrency(amount)}
      </div>
      {trend && (
        <p className="text-xs text-muted-foreground mt-1">
          <span className={trend > 0 ? 'text-green-600' : 'text-red-600'}>
            {trend > 0 ? '+' : ''}{trend}%
          </span> from yesterday
        </p>
      )}
    </CardContent>
  </Card>
)

const TimeRangeStats = ({ title, data }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-2 bg-green-50 rounded">
          <span className="text-sm font-medium text-gray-600 shrink-0 mr-2">Payin</span>
          <span className="text-base sm:text-lg font-bold text-green-600 truncate" title={formatCurrency(data.payin)}>
            {formatCurrency(data.payin)}
          </span>
        </div>
        <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
          <span className="text-sm font-medium text-gray-600 shrink-0 mr-2">Payout</span>
          <span className="text-base sm:text-lg font-bold text-blue-600 truncate" title={formatCurrency(data.payout)}>
            {formatCurrency(data.payout)}
          </span>
        </div>
      </div>
    </CardContent>
  </Card>
)

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [payinStats, setPayinStats] = useState({
    success: { count: 0, amount: 0 },
    pending: { count: 0, amount: 0 },
    failed: { count: 0, amount: 0 }
  })
  const [payoutStats, setPayoutStats] = useState({
    success: { count: 0, amount: 0 },
    pending: { count: 0, amount: 0 },
    failed: { count: 0, amount: 0 },
    queued: { count: 0, amount: 0 }
  })
  const [timeRangeData, setTimeRangeData] = useState({
    today: { payin: 0, payout: 0 },
    yesterday: { payin: 0, payout: 0 },
    last7days: { payin: 0, payout: 0 },
    last30days: { payin: 0, payout: 0 },
  })
  const [totals, setTotals] = useState({
    totalPayinCharges: 0,
    totalPayoutCharges: 0,
    totalIncome: 0,
    totalSettled: 0,
    totalUnsettled: 0
  })
  const [activeRoutesToday, setActiveRoutesToday] = useState([])
  const [topMerchantsToday, setTopMerchantsToday] = useState([])

  useEffect(() => {
    loadDashboardData()
    
    // Auto-refresh every 30 seconds
    const intervalId = setInterval(() => {
      loadDashboardData()
    }, 30000) // 30 seconds
    
    // Cleanup interval on component unmount
    return () => clearInterval(intervalId)
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [payinResponse, payoutResponse, walletSummaryResponse] = await Promise.all([
        adminAPI.getPayinStats(),
        adminAPI.getPayoutStats(),
        adminAPI.getWalletSummary()
      ])
      
      if (payinResponse.success) {
        setPayinStats(payinResponse.stats)
        
        // Update totals with payin charges
        if (payinResponse.totals) {
          setTotals(prev => ({
            ...prev,
            totalPayinCharges: payinResponse.totals.total_payin_charges
          }))
        }
        
        // Update time range data with payin data
        if (payinResponse.timeRanges) {
          setTimeRangeData(prev => ({
            today: { ...prev.today, payin: payinResponse.timeRanges.today.payin },
            yesterday: { ...prev.yesterday, payin: payinResponse.timeRanges.yesterday.payin },
            last7days: { ...prev.last7days, payin: payinResponse.timeRanges.last7days.payin },
            last30days: { ...prev.last30days, payin: payinResponse.timeRanges.last30days.payin },
          }))
        }
        
        if (payinResponse.activeRoutesToday) {
          setActiveRoutesToday(payinResponse.activeRoutesToday)
        }
        
        if (payinResponse.topMerchantsToday) {
          setTopMerchantsToday(payinResponse.topMerchantsToday)
        }
      }
      
      if (payoutResponse.success) {
        setPayoutStats(payoutResponse.stats)
        
        // Update totals with payout charges
        if (payoutResponse.totals) {
          setTotals(prev => ({
            ...prev,
            totalPayoutCharges: payoutResponse.totals.total_payout_charges,
            totalIncome: prev.totalPayinCharges + payoutResponse.totals.total_payout_charges
          }))
        }
        
        // Update time range data with payout data
        if (payoutResponse.timeRanges) {
          setTimeRangeData(prev => ({
            today: { ...prev.today, payout: payoutResponse.timeRanges.today.payout },
            yesterday: { ...prev.yesterday, payout: payoutResponse.timeRanges.yesterday.payout },
            last7days: { ...prev.last7days, payout: payoutResponse.timeRanges.last7days.payout },
            last30days: { ...prev.last30days, payout: payoutResponse.timeRanges.last30days.payout },
          }))
        }
      }
      
      if (walletSummaryResponse.success && walletSummaryResponse.data) {
        setTotals(prev => ({
          ...prev,
          totalSettled: walletSummaryResponse.data.total_settled || 0,
          totalUnsettled: walletSummaryResponse.data.total_unsettled || 0
        }))
      }
      
      setLastUpdated(new Date())
    } catch (error) {
      toast.error('Failed to load dashboard data')
      console.error('Dashboard data error:', error)
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    settled: payinStats.success.amount,
    unsettled: payinStats.pending.amount,
    total: payinStats.success.amount + payinStats.pending.amount + payinStats.failed.amount,
  }

  const payoutTotals = {
    total: payoutStats.success.amount + payoutStats.pending.amount + payoutStats.queued.amount + payoutStats.failed.amount
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's your payment overview</p>
          {lastUpdated && (
            <p className="text-xs text-gray-500 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()} • Auto-refreshes every 30s
            </p>
          )}
        </div>
        <Button onClick={loadDashboardData} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Active Payin Routes Today */}
      {activeRoutesToday.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" /> Active Payin Routes Today
          </h2>
          <div className="flex flex-nowrap overflow-x-auto gap-4 pb-2">
            {activeRoutesToday.map((route, idx) => (
              <Card key={idx} className={`min-w-[280px] border-2 shadow-sm ${idx % 3 === 0 ? 'border-green-200 bg-green-50' : idx % 3 === 1 ? 'border-blue-200 bg-blue-50' : 'border-indigo-200 bg-indigo-50'}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-gray-800 uppercase tracking-wider">{route.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-500 font-medium uppercase mb-1">Today's Payin</p>
                  <div className="text-2xl font-black text-gray-800">{formatCurrency(route.amount)}</div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-2 text-right">Active Route</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Top Merchants Today */}
      {topMerchantsToday.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-600" /> Top Merchants Today
          </h2>
          <div className="flex flex-nowrap overflow-x-auto gap-4 pb-2">
            {topMerchantsToday.map((merchant, idx) => (
              <Card key={idx} className="min-w-[280px] border border-gray-200 shadow-sm bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-gray-800 uppercase tracking-wider">{merchant.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-500 font-medium uppercase mb-1">Today's Volume</p>
                  <div className="text-2xl font-black text-green-600">{formatCurrency(merchant.amount)}</div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-2 text-right">Merchant</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Time Range Stats (Global) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <TimeRangeStats title="Today" data={timeRangeData.today} />
        <TimeRangeStats title="Yesterday" data={timeRangeData.yesterday} />
        <TimeRangeStats title="Last 7 Days" data={timeRangeData.last7days} />
        <TimeRangeStats title="Last 30 Days" data={timeRangeData.last30days} />
      </div>

      {/* Payin/Payout Tabs */}
      <Tabs defaultValue="payin" className="w-full mt-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="payin">Payin</TabsTrigger>
          <TabsTrigger value="payout">Payout</TabsTrigger>
        </TabsList>
        
        <TabsContent value="payin" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Payin Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Success</p>
                      <p className="text-2xl font-bold text-green-600">{payinStats.success.count}</p>
                    </div>
                    <ArrowUpCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{formatCurrency(payinStats.success.amount)}</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pending</p>
                      <p className="text-2xl font-bold text-yellow-600">{payinStats.pending.count}</p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-600" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{formatCurrency(payinStats.pending.amount)}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Failed</p>
                      <p className="text-2xl font-bold text-red-600">{payinStats.failed.count}</p>
                    </div>
                    <ArrowDownCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{formatCurrency(payinStats.failed.amount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payout" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Payout Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Success</p>
                      <p className="text-2xl font-bold text-green-600">{payoutStats.success.count}</p>
                    </div>
                    <ArrowUpCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{formatCurrency(payoutStats.success.amount)}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Queued</p>
                      <p className="text-2xl font-bold text-blue-600">{payoutStats.queued.count}</p>
                    </div>
                    <Clock className="h-8 w-8 text-blue-600" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{formatCurrency(payoutStats.queued.amount)}</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pending</p>
                      <p className="text-2xl font-bold text-yellow-600">{payoutStats.pending.count}</p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-600" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{formatCurrency(payoutStats.pending.amount)}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Failed</p>
                      <p className="text-2xl font-bold text-red-600">{payoutStats.failed.count}</p>
                    </div>
                    <ArrowDownCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{formatCurrency(payoutStats.failed.amount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Settled Amount"
          amount={stats.settled}
          trend={12.5}
          icon={TrendingUp}
          color="text-green-600"
        />
        <StatCard
          title="Unsettled Amount"
          amount={stats.unsettled}
          trend={-3.2}
          icon={Clock}
          color="text-yellow-600"
        />
        <StatCard
          title="Total Amount"
          amount={stats.total}
          trend={8.7}
          icon={DollarSign}
          color="text-blue-600"
        />
      </div>

      {/* Wallet Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Total Settled Amount (All Merchants)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl sm:text-3xl font-bold text-green-700 truncate" title={formatCurrency(totals.totalSettled)}>
              {formatCurrency(totals.totalSettled)}
            </p>
            <p className="text-xs text-gray-500 mt-2">Available for merchant payouts</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              Total Unsettled Amount (All Merchants)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl sm:text-3xl font-bold text-orange-700 truncate" title={formatCurrency(totals.totalUnsettled)}>
              {formatCurrency(totals.totalUnsettled)}
            </p>
            <p className="text-xs text-gray-500 mt-2">Pending admin settlement approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Business Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Successful Payin</CardTitle>
            <ArrowUpCircle className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-600 truncate" title={formatCurrency(payinStats.success.amount)}>{formatCurrency(payinStats.success.amount)}</div>
            <p className="text-xs text-gray-500 mt-1">{payinStats.success.count} transactions</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Payout</CardTitle>
            <ArrowDownCircle className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-blue-600 truncate" title={formatCurrency(payoutStats.success.amount)}>{formatCurrency(payoutStats.success.amount)}</div>
            <p className="text-xs text-gray-500 mt-1">{payoutStats.success.count} transactions</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Income</CardTitle>
            <DollarSign className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-purple-600 truncate" title={formatCurrency(totals.totalIncome)}>{formatCurrency(totals.totalIncome)}</div>
            <p className="text-xs text-gray-500 mt-1">
              Payin: {formatCurrency(totals.totalPayinCharges)} + Payout: {formatCurrency(totals.totalPayoutCharges)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
