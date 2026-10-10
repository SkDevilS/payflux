import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Lock, User, Eye, EyeOff, ArrowDownToLine, ArrowUpFromLine, Wallet, RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'
import clientAPI from '@/api/client_api'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function Login() {
  usePageTitle('Payflux');
  const navigate = useNavigate()
  const location = useLocation()
  const [credentials, setCredentials] = useState({ 
    merchantId: '', 
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const from = location.state?.from?.pathname || '/'

  useEffect(() => {
    if (clientAPI.isAuthenticated()) {
      navigate(from, { replace: true })
    }
  }, [navigate, from])

  const handleLogin = async (e) => {
    e.preventDefault()
    
    if (!credentials.merchantId || !credentials.password) {
      toast.error('Please fill all fields')
      return
    }

    setLoading(true)
    try {
      const response = await clientAPI.login(
        credentials.merchantId, 
        credentials.password
      )
      
      if (response.success) {
        toast.success(`Welcome back!`)
        navigate(from, { replace: true })
      }
    } catch (error) {
      toast.error(error.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen w-full flex overflow-hidden bg-white font-sans selection:bg-blue-100">
      
      {/* Left Decorative Panel */}
      <div className="hidden lg:flex w-[45%] relative flex-col justify-between p-12 bg-slate-50 overflow-hidden border-r border-slate-100">
        
        {/* Animated Background Elements */}
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-[80px] animate-pulse"></div>
        <div className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-tl from-cyan-400/20 to-blue-400/20 blur-[80px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        <div className="relative z-10">
          <img src="/payflux.png" alt="Payflux" className="h-20 object-contain" />
        </div>

        <div className="relative z-10 max-w-md my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            New Merchant Portal
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 mb-6 leading-[1.2] tracking-tight">
            Accelerate your business with Payflux.
          </h1>
          <p className="text-lg text-slate-500 leading-relaxed">
            The next-generation payment infrastructure for modern businesses. Collect, disburse, and manage finances effortlessly.
          </p>
        </div>

        <div className="relative z-10 flex gap-6 text-sm font-medium text-slate-500">
           <p>© 2026 Payflux Inc.</p>
           <a href="#" className="hover:text-blue-600 transition-colors">Privacy</a>
           <a href="#" className="hover:text-blue-600 transition-colors">Terms</a>
        </div>
      </div>

      {/* Right Login Panel */}
      <div className="w-full lg:w-[55%] flex flex-col justify-center px-8 sm:px-16 lg:px-24 bg-white relative z-10">
        
        {/* Mobile Logo */}
        <div className="lg:hidden absolute top-8 left-8">
           <img src="/payflux.png" alt="Payflux" className="h-16 object-contain" />
        </div>

        <div className="w-full max-w-[400px] mx-auto">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">Welcome back</h2>
            <p className="text-slate-500">Enter your credentials to access your dashboard.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Merchant ID</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  </div>
                  <Input
                    type="text"
                    placeholder="e.g. MX-84920"
                    value={credentials.merchantId}
                    onChange={(e) => setCredentials({ ...credentials, merchantId: e.target.value })}
                    className="pl-12 h-14 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 rounded-xl transition-all text-[15px] shadow-sm hover:border-slate-300"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700">Password</label>
                  <a href="#" className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">Forgot password?</a>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  </div>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    className="pl-12 pr-12 h-14 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 rounded-xl transition-all text-[15px] shadow-sm hover:border-slate-300"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
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
              className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 text-[15px]"
            >
              {loading ? (
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </div>
              ) : 'Sign In'}
            </Button>
          </form>

          <div className="mt-8 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-500 font-medium">Need an account?</span>
            </div>
          </div>
          
          <div className="mt-8 text-center">
             <a href="#" className="text-slate-900 font-semibold hover:text-blue-600 transition-colors">
                Contact Sales
             </a>
          </div>
        </div>
      </div>
    </div>
  )
}
