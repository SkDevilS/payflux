import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, DollarSign, 
  ArrowUpCircle, ArrowDownCircle, Clock, RefreshCw, Wallet,
  ArrowUpRight, ArrowDownRight, CheckCircle2, AlertCircle, XCircle
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import clientAPI from '@/api/client_api'
import { toast } from 'sonner'

const TimeRangeStats = ({ title, data }) => (
  <Card className="bg-white border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 h-full flex flex-col rounded-xl">
    <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 pt-4 px-5">
      <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</CardTitle>
    </CardHeader>
    <CardContent className="p-0 flex-1 flex flex-col justify-center">
      <div className="grid grid-cols-2 divide-x divide-slate-100 h-full">
        <div className="p-5 flex flex-col justify-center bg-white hover:bg-slate-50 transition-colors group">
          <span className="text-[11px] font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
            <ArrowDownRight className="w-3.5 h-3.5 text-emerald-500" /> Payin
          </span>
          <span className="text-lg font-bold text-slate-800 tracking-tight">{formatCurrency(data.payin)}</span>
        </div>
        <div className="p-5 flex flex-col justify-center bg-white hover:bg-slate-50 transition-colors group">
          <span className="text-[11px] font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
            <ArrowUpRight className="w-3.5 h-3.5 text-indigo-500" /> Payout
          </span>
          <span className="text-lg font-bold text-slate-800 tracking-tight">{formatCurrency(data.payout)}</span>
        </div>
      </div>
    </CardContent>
  </Card>
)

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [walletData, setWalletData] = useState({
    balance: 0,
    netPayin: 0,
    grossPayin: 0,
    payinCharges: 0,
    totalPayout: 0,
    payoutCharges: 0,
    settled_balance: 0,
    unsettled_balance: 0
  })
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

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      const [walletResponse, payinStatsResponse, payoutStatsResponse] = await Promise.all([
        clientAPI.getWalletOverview(),
        clientAPI.getPayinStats(),
        clientAPI.getPayoutStats()
      ])
      
      if (walletResponse.success && walletResponse.data) {
        setWalletData({
          balance: walletResponse.data.balance || 0,
          netPayin: walletResponse.data.payin_amount || 0,
          grossPayin: walletResponse.data.gross_payin || 0,
          payinCharges: walletResponse.data.payin_charges || 0,
          totalPayout: walletResponse.data.total_settlements || 0,
          payoutCharges: walletResponse.data.payout_charges || 0,
          settled_balance: walletResponse.data.settled_balance || 0,
          unsettled_balance: walletResponse.data.unsettled_balance || 0
        })
      }
      
      if (payinStatsResponse.success) {
        setPayinStats(payinStatsResponse.stats || {
          success: { count: 0, amount: 0 },
          pending: { count: 0, amount: 0 },
          failed: { count: 0, amount: 0 }
        })
        
        if (payinStatsResponse.timeRanges) {
          setTimeRangeData(prev => ({
            ...prev,
            today: { ...prev.today, payin: payinStatsResponse.timeRanges.today.payin },
            yesterday: { ...prev.yesterday, payin: payinStatsResponse.timeRanges.yesterday.payin },
            last7days: { ...prev.last7days, payin: payinStatsResponse.timeRanges.last7days.payin },
            last30days: { ...prev.last30days, payin: payinStatsResponse.timeRanges.last30days.payin },
          }))
        }
      }
      
      if (payoutStatsResponse.success) {
        setPayoutStats(payoutStatsResponse.stats || {
          success: { count: 0, amount: 0 },
          pending: { count: 0, amount: 0 },
          failed: { count: 0, amount: 0 },
          queued: { count: 0, amount: 0 }
        })
        
        if (payoutStatsResponse.timeRanges) {
          setTimeRangeData(prev => ({
            ...prev,
            today: { ...prev.today, payout: payoutStatsResponse.timeRanges.today.payout },
            yesterday: { ...prev.yesterday, payout: payoutStatsResponse.timeRanges.yesterday.payout },
            last7days: { ...prev.last7days, payout: payoutStatsResponse.timeRanges.last7days.payout },
            last30days: { ...prev.last30days, payout: payoutStatsResponse.timeRanges.last30days.payout },
          }))
        }
      }
    } catch (error) {
      toast.error('Failed to load dashboard data')
      console.error('Dashboard data error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-sm font-medium text-slate-500">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-sm text-slate-500 mt-1">Your payment volumes and wallet status at a glance.</p>
        </div>
        <Button onClick={loadDashboardData} variant="outline" size="sm" className="bg-white shadow-sm border-slate-200 text-slate-600 hover:bg-slate-50 w-fit">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Main Stats - NET PAYIN and NET PAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* First Box: NET PAYIN */}
        <Card className="shadow-sm border border-slate-200 bg-white rounded-xl overflow-hidden">
          <CardHeader className="pb-4 pt-5 px-6 flex flex-row items-center justify-between bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <div className="p-1.5 bg-emerald-100 rounded-md text-emerald-600">
                <ArrowDownRight className="h-4 w-4" />
              </div>
              Total Net Payin
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-slate-900 tracking-tight mb-6">{formatCurrency(walletData.netPayin)}</div>
            <div className="space-y-3 bg-slate-50/80 border border-slate-100 p-4 rounded-xl">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Gross Collection</span>
                <span className="font-semibold text-slate-700">{formatCurrency(walletData.grossPayin)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Processing Fees</span>
                <span className="font-medium text-slate-400">- {formatCurrency(walletData.payinCharges)}</span>
              </div>
              <div className="border-t border-slate-200 pt-3 mt-1 flex justify-between items-center text-sm">
                <span className="font-semibold text-slate-700">Net Settled</span>
                <span className="font-bold text-emerald-600">{formatCurrency(walletData.netPayin)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Second Box: NET PAYOUT */}
        <Card className="shadow-sm border border-slate-200 bg-white rounded-xl overflow-hidden">
          <CardHeader className="pb-4 pt-5 px-6 flex flex-row items-center justify-between bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <div className="p-1.5 bg-indigo-100 rounded-md text-indigo-600">
                <ArrowUpRight className="h-4 w-4" />
              </div>
              Total Net Payout
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-slate-900 tracking-tight mb-6">{formatCurrency(walletData.totalPayout)}</div>
            <div className="space-y-3 bg-slate-50/80 border border-slate-100 p-4 rounded-xl">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Disbursed Amount</span>
                <span className="font-semibold text-slate-700">{formatCurrency(walletData.totalPayout)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Transfer Fees</span>
                <span className="font-medium text-slate-400">+ {formatCurrency(walletData.payoutCharges || 0)}</span>
              </div>
              <div className="border-t border-slate-200 pt-3 mt-1 flex justify-between items-center text-sm">
                <span className="font-semibold text-slate-700">Total Deducted</span>
                <span className="font-bold text-indigo-600">{formatCurrency(walletData.totalPayout + (walletData.payoutCharges || 0))}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wallet Balance Cards - Settled and Unsettled */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border border-slate-200 bg-white shadow-sm rounded-xl hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-2 pt-6 px-6">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Settled Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-2">
            <p className="text-4xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(walletData.settled_balance)}
            </p>
            <p className="text-sm text-slate-500 mt-2 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Available for payout withdrawal
            </p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white shadow-sm rounded-xl hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-2 pt-6 px-6">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Unsettled Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-2">
            <p className="text-4xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(walletData.unsettled_balance)}
            </p>
            <p className="text-sm text-slate-500 mt-2 font-medium flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-500" /> Pending clearance by administration
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Time Range Stats (Day-wise) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <TimeRangeStats title="Today" data={timeRangeData.today} />
        <TimeRangeStats title="Yesterday" data={timeRangeData.yesterday} />
        <TimeRangeStats title="Last 7 Days" data={timeRangeData.last7days} />
        <TimeRangeStats title="Last 30 Days" data={timeRangeData.last30days} />
      </div>

      {/* Payin/Payout Tabs */}
      <Tabs defaultValue="payin" className="w-full pt-4">
        <TabsList className="grid w-full max-w-sm grid-cols-2 bg-slate-100 rounded-lg p-1 h-11 mb-6">
          <TabsTrigger value="payin" className="rounded-md data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm font-medium transition-all text-sm h-full text-slate-500">Payin Overview</TabsTrigger>
          <TabsTrigger value="payout" className="rounded-md data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm font-medium transition-all text-sm h-full text-slate-500">Payout Overview</TabsTrigger>
        </TabsList>
        
        <TabsContent value="payin">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Successful Payins</p>
              </div>
              <p className="text-3xl font-bold text-slate-900 tracking-tight mb-1">{payinStats.success.count}</p>
              <p className="text-sm font-medium text-slate-500 mb-4">Transactions</p>
              <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                <span className="text-slate-500 text-sm">Volume</span>
                <span className="font-semibold text-slate-700">{formatCurrency(payinStats.success.amount)}</span>
              </div>
            </div>

            <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Pending Payins</p>
              </div>
              <p className="text-3xl font-bold text-slate-900 tracking-tight mb-1">{payinStats.pending.count}</p>
              <p className="text-sm font-medium text-slate-500 mb-4">Transactions</p>
              <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                <span className="text-slate-500 text-sm">Volume</span>
                <span className="font-semibold text-slate-700">{formatCurrency(payinStats.pending.amount)}</span>
              </div>
            </div>

            <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-rose-50 rounded-lg">
                  <XCircle className="h-5 w-5 text-rose-600" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Failed Payins</p>
              </div>
              <p className="text-3xl font-bold text-slate-900 tracking-tight mb-1">{payinStats.failed.count}</p>
              <p className="text-sm font-medium text-slate-500 mb-4">Transactions</p>
              <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                <span className="text-slate-500 text-sm">Volume</span>
                <span className="font-semibold text-slate-700">{formatCurrency(payinStats.failed.amount)}</span>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="payout">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Successful</p>
              </div>
              <p className="text-3xl font-bold text-slate-900 tracking-tight mb-1">{payoutStats.success.count}</p>
              <p className="text-sm font-medium text-slate-500 mb-4">Transactions</p>
              <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                <span className="text-slate-500 text-sm">Volume</span>
                <span className="font-semibold text-slate-700">{formatCurrency(payoutStats.success.amount)}</span>
              </div>
            </div>

            <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <ArrowUpRight className="h-5 w-5 text-indigo-600" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Queued</p>
              </div>
              <p className="text-3xl font-bold text-slate-900 tracking-tight mb-1">{payoutStats.queued.count}</p>
              <p className="text-sm font-medium text-slate-500 mb-4">Transactions</p>
              <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                <span className="text-slate-500 text-sm">Volume</span>
                <span className="font-semibold text-slate-700">{formatCurrency(payoutStats.queued.amount)}</span>
              </div>
            </div>

            <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Pending</p>
              </div>
              <p className="text-3xl font-bold text-slate-900 tracking-tight mb-1">{payoutStats.pending.count}</p>
              <p className="text-sm font-medium text-slate-500 mb-4">Transactions</p>
              <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                <span className="text-slate-500 text-sm">Volume</span>
                <span className="font-semibold text-slate-700">{formatCurrency(payoutStats.pending.amount)}</span>
              </div>
            </div>

            <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-rose-50 rounded-lg">
                  <XCircle className="h-5 w-5 text-rose-600" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Failed</p>
              </div>
              <p className="text-3xl font-bold text-slate-900 tracking-tight mb-1">{payoutStats.failed.count}</p>
              <p className="text-sm font-medium text-slate-500 mb-4">Transactions</p>
              <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                <span className="text-slate-500 text-sm">Volume</span>
                <span className="font-semibold text-slate-700">{formatCurrency(payoutStats.failed.amount)}</span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
