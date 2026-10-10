import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wallet, TrendingUp, TrendingDown, RefreshCw, Activity, ArrowUpRight, ArrowDownRight, IndianRupee } from 'lucide-react'
import { Button } from '@/components/ui/button'
import clientAPI from '@/api/client_api'
import { toast } from 'sonner'

export default function WalletOverview() {
  const [loading, setLoading] = useState(true)
  const [walletData, setWalletData] = useState({
    balance: 0,
    totalCredit: 0,
    totalDebit: 0,
    payinAmount: 0,
    grossPayin: 0,
    payinCharges: 0
  })

  useEffect(() => {
    loadWalletData()
  }, [])

  const loadWalletData = async () => {
    try {
      setLoading(true)
      const response = await clientAPI.getWalletOverview()
      if (response.success && response.data) {
        setWalletData({
          balance: response.data.balance || 0,
          totalCredit: response.data.total_credit || 0,
          totalDebit: response.data.total_debit || 0,
          payinAmount: response.data.payin_amount || 0,
          grossPayin: response.data.gross_payin || 0,
          payinCharges: response.data.payin_charges || 0
        })
      }
    } catch (error) {
      toast.error('Failed to load wallet data')
      console.error('Wallet data error:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount)
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100 shadow-sm">
            <Wallet className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
              Wallet Overview
            </h1>
            <p className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-emerald-500" />
              Real-time balance and transaction summary
            </p>
          </div>
        </div>
        <Button 
          onClick={loadWalletData} 
          disabled={loading}
          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 transition-all shadow-sm rounded-lg h-9 px-4 text-sm group"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-2 text-indigo-500 group-hover:text-indigo-600 transition-colors ${loading ? 'animate-spin' : ''}`} />
          Sync Data
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="relative">
            <div className="absolute -inset-4 bg-indigo-500/20 rounded-full blur-xl animate-pulse"></div>
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 relative z-10"></div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Stat Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Wallet Balance */}
            <div className="relative group overflow-hidden rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 transition-all duration-300 hover:-translate-y-1 hover:shadow-md p-5 flex flex-col justify-between h-32 shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 tracking-wider uppercase">Available Balance</span>
                <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Wallet className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
              <div className="relative z-10 mt-2">
                <p className="text-2xl font-black text-slate-800 tracking-tight">
                  {formatCurrency(walletData.balance)}
                </p>
                <p className="text-[10px] font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3" /> Topped up by Admin
                </p>
              </div>
            </div>

            {/* Net PayIN */}
            <div className="relative group overflow-hidden rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 transition-all duration-300 hover:-translate-y-1 hover:shadow-md p-5 flex flex-col justify-between h-32 shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 tracking-wider uppercase">Net PayIN</span>
                <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <IndianRupee className="h-4 w-4 text-indigo-600" />
                </div>
              </div>
              <div className="relative z-10 mt-2">
                <p className="text-2xl font-black text-slate-800 tracking-tight">
                  {formatCurrency(walletData.payinAmount)}
                </p>
                <p className="text-[10px] font-semibold text-slate-500 mt-1">
                  After charges (₹{walletData.grossPayin.toFixed(2)} - ₹{walletData.payinCharges.toFixed(2)})
                </p>
              </div>
            </div>

            {/* Total Credits */}
            <div className="relative group overflow-hidden rounded-2xl bg-white border border-slate-200 hover:border-blue-300 transition-all duration-300 hover:-translate-y-1 hover:shadow-md p-5 flex flex-col justify-between h-32 shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 tracking-wider uppercase">Total Credits</span>
                <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <ArrowUpRight className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <div className="relative z-10 mt-2">
                <p className="text-2xl font-black text-slate-800 tracking-tight">
                  {formatCurrency(walletData.totalCredit)}
                </p>
                <p className="text-[10px] font-semibold text-blue-600 mt-1 flex items-center gap-1">
                   Lifetime inbound volume
                </p>
              </div>
            </div>

            {/* Total Debits */}
            <div className="relative group overflow-hidden rounded-2xl bg-white border border-slate-200 hover:border-rose-300 transition-all duration-300 hover:-translate-y-1 hover:shadow-md p-5 flex flex-col justify-between h-32 shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 tracking-wider uppercase">Total Debits</span>
                <div className="h-8 w-8 rounded-full bg-rose-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <ArrowDownRight className="h-4 w-4 text-rose-600" />
                </div>
              </div>
              <div className="relative z-10 mt-2">
                <p className="text-2xl font-black text-slate-800 tracking-tight">
                  {formatCurrency(walletData.totalDebit)}
                </p>
                <p className="text-[10px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                   Settlements transferred out
                </p>
              </div>
            </div>
          </div>

          {/* Breakdown Section */}
          <div className="mt-8">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="h-6 w-1 rounded-full bg-indigo-500"></div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Detailed Breakdown</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {/* Item 1 */}
              <div className="group relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all duration-300 shadow-sm">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500/0 group-hover:bg-indigo-500 transition-colors"></div>
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100 shadow-sm">
                    <TrendingUp className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">Net PayIN Amount</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Gross: <span className="text-slate-600 font-semibold">{formatCurrency(walletData.grossPayin)}</span> • 
                      Charges: <span className="text-rose-500 font-semibold">{formatCurrency(walletData.payinCharges)}</span>
                    </p>
                  </div>
                </div>
                <div className="mt-3 sm:mt-0 text-left sm:text-right">
                  <p className="text-xl font-black text-indigo-600">{formatCurrency(walletData.payinAmount)}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Processed</p>
                </div>
              </div>

              {/* Item 2 */}
              <div className="group relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-xl transition-all duration-300 shadow-sm">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500/0 group-hover:bg-blue-500 transition-colors"></div>
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm">
                    <ArrowUpRight className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">Total Wallet Credits</p>
                    <p className="text-xs text-slate-500 mt-0.5">Overall lifetime credit flow into the wallet</p>
                  </div>
                </div>
                <div className="mt-3 sm:mt-0 text-left sm:text-right">
                  <p className="text-xl font-black text-blue-600">{formatCurrency(walletData.totalCredit)}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Lifetime</p>
                </div>
              </div>

              {/* Item 3 */}
              <div className="group relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-rose-300 rounded-xl transition-all duration-300 shadow-sm">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500/0 group-hover:bg-rose-500 transition-colors"></div>
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center border border-rose-100 shadow-sm">
                    <ArrowDownRight className="h-5 w-5 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">Total Wallet Debits</p>
                    <p className="text-xs text-slate-500 mt-0.5">Total settlements processed to external banks</p>
                  </div>
                </div>
                <div className="mt-3 sm:mt-0 text-left sm:text-right">
                  <p className="text-xl font-black text-rose-600">{formatCurrency(walletData.totalDebit)}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Settled</p>
                </div>
              </div>

              {/* Item 4 */}
              <div className="group relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-gradient-to-r from-emerald-50 to-white border border-emerald-200 hover:border-emerald-400 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="relative h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center border border-emerald-200 shadow-sm">
                      <Wallet className="h-5 w-5 text-emerald-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-base font-black text-slate-800">Current Balance</p>
                    <p className="text-xs text-emerald-600 font-semibold mt-0.5">Available for use • Topped up by admin</p>
                  </div>
                </div>
                <div className="mt-3 sm:mt-0 text-left sm:text-right">
                  <p className="text-2xl font-black text-emerald-600 drop-shadow-sm">{formatCurrency(walletData.balance)}</p>
                  <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-0.5">Available</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
