import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Lock, Mail, Eye, EyeOff, ShieldCheck, Activity, Users, Database } from 'lucide-react'
import { toast } from 'sonner'
import adminAPI from '@/api/admin_api'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function Login() {
  usePageTitle('Payflux');
  const navigate = useNavigate()
  const [credentials, setCredentials] = useState({ 
    adminId: '', 
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    
    if (!credentials.adminId || !credentials.password) {
      toast.error('Please fill all fields')
      return
    }

    setLoading(true)
    try {
      const response = await adminAPI.login(
        credentials.adminId,
        credentials.password
      )

      if (response.success) {
        toast.success('Welcome back!')
        navigate('/')
      }
    } catch (error) {
      toast.error(error.message || 'Login failed')
      setCredentials({ ...credentials, password: '' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-white font-sans selection:bg-blue-100">
      
      {/* Left Panel - Dark, Enterprise Aesthetic */}
      <div className="hidden lg:flex w-[50%] relative flex-col justify-between p-12 lg:p-16 bg-[#0f172a] overflow-hidden">
        
        {/* Background Grid & Glow */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)] opacity-20"></div>
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3"></div>

        <div className="relative z-10">
          <img src="/payflux.png" alt="Payflux" className="h-10 object-contain brightness-0 invert" />
        </div>

        <div className="relative z-10 w-full max-w-lg mt-auto mb-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-6">
            <ShieldCheck className="w-4 h-4" />
            Admin Environment
          </div>
          <h1 className="text-4xl font-bold text-white mb-6 leading-tight tracking-tight">
            Centralized Command for System Operations.
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed font-light mb-12">
            Securely monitor live transactions, manage merchant accounts, and govern the core infrastructure from a single pane of glass.
          </p>
          
          <div className="space-y-5">
             <div className="flex items-center gap-4 text-slate-300">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                   <Activity className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                   <h4 className="text-sm font-semibold text-white">Live Telemetry</h4>
                   <p className="text-sm text-slate-400">Real-time system health & routing logic</p>
                </div>
             </div>
             <div className="flex items-center gap-4 text-slate-300">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                   <Users className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                   <h4 className="text-sm font-semibold text-white">Merchant Provisioning</h4>
                   <p className="text-sm text-slate-400">Manage access, limits, and compliance</p>
                </div>
             </div>
             <div className="flex items-center gap-4 text-slate-300">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                   <Database className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                   <h4 className="text-sm font-semibold text-white">Ledger Oversight</h4>
                   <p className="text-sm text-slate-400">Immutable transaction logs and reconciliation</p>
                </div>
             </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-sm text-slate-500">
           <span className="relative flex h-2.5 w-2.5">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
             <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
           </span>
           All systems operational
        </div>
      </div>

      {/* Right Panel - Clean, Minimal Login Form */}
      <div className="w-full lg:w-[50%] flex flex-col justify-center px-8 sm:px-16 lg:px-24 bg-white relative z-10 shadow-[-20px_0_40px_rgba(0,0,0,0.02)]">
        
        {/* Mobile Header */}
        <div className="lg:hidden absolute top-8 left-8 flex items-center gap-3">
           <img src="/payflux.png" alt="Payflux" className="h-8 object-contain" />
           <span className="text-xs font-semibold px-2 py-1 bg-slate-100 rounded text-slate-600">Admin</span>
        </div>

        <div className="w-full max-w-[420px] mx-auto">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Admin Gateway</h2>
            <p className="text-slate-500 text-sm">Please authenticate to continue to the control panel.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Admin ID</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Enter your ID"
                    value={credentials.adminId}
                    onChange={(e) => setCredentials({ ...credentials, adminId: e.target.value })}
                    className="pl-11 h-12 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-lg transition-colors text-[15px]"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Password</label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    className="pl-11 pr-11 h-12 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-lg transition-colors text-[15px]"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all shadow-[0_4px_14px_0_rgba(37,99,235,0.2)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] hover:-translate-y-0.5 text-[15px] mt-2"
            >
              {loading ? (
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </div>
              ) : 'Access Core'}
            </Button>
          </form>

          <div className="mt-10 border-t border-slate-100 pt-6">
            <p className="text-xs text-slate-400 font-mono flex items-center gap-2 justify-center lg:justify-start">
              <ShieldCheck className="w-4 h-4 text-blue-600" /> 
              Restricted access network.
            </p>
          </div>
          
        </div>
      </div>
    </div>
  )
}
