import { useState, useEffect } from 'react'
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, ArrowLeftRight, Wallet, 
  TrendingUp, Shield, Settings, 
  ChevronDown, LogOut, Bell, Search,
  FileText, Clock, DollarSign, Building,
  Lock, Key, Book, KeyRound, QrCode, CreditCard, User,
  ChevronLeft, ChevronRight, Activity
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import clientAPI from '@/api/client_api'
import SessionExpiryWarning from '@/components/SessionExpiryWarning'
import PinNotification from '@/components/PinNotification'

const menuItems = [
  { 
    title: 'Dashboard', 
    icon: LayoutDashboard, 
    path: '/' 
  },
  {
    title: 'Transactions',
    icon: Activity,
    submenu: [
      { title: 'Collections', icon: Activity, path: '/transactions/payin-report' },
      { title: 'Payouts', icon: CreditCard, path: '/transactions/payout-report' },
    ]
  },
  {
    title: 'Manage Funds',
    icon: TrendingUp,
    submenu: [
      { title: 'Wallet Overview', icon: Wallet, path: '/wallet/overview' },
      { title: 'Wallet Summary', icon: FileText, path: '/wallet/statement' },
      { title: 'Fund Requests', icon: FileText, path: '/fund-manager/request' },
    ]
  },
  {
    title: 'Settings',
    icon: Settings,
    submenu: [
      { title: 'Change Password', icon: Lock, path: '/security/change-password' },
      { title: 'Change PIN', icon: Key, path: '/security/change-pin' },
      { title: 'Rates', icon: CreditCard, path: '/my-commercials' },
    ]
  },
  {
    title: 'Developer Zone',
    icon: Book,
    submenu: [
      { title: 'API Documentation', icon: FileText, path: '/developer/documentation' },
      { title: 'API Credentials', icon: KeyRound, path: '/developer/credentials' },
    ]
  },
  { 
    title: 'Collect Payment', 
    icon: QrCode, 
    path: '/generate-qr' 
  },
]

export default function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [expandedMenus, setExpandedMenus] = useState({})
  const [merchantInfo, setMerchantInfo] = useState({
    name: 'Merchant User',
    email: 'merchant@example.com'
  })

  useEffect(() => {
    // Load merchant info from localStorage
    const merchantName = clientAPI.getMerchantName()
    const merchantId = clientAPI.getMerchantId()
    
    if (merchantName) {
      setMerchantInfo({
        name: merchantName,
        email: merchantId || 'merchant@example.com'
      })
    }

    // Verify token on mount
    verifyAuth()
  }, [])

  const verifyAuth = async () => {
    try {
      await clientAPI.verifyToken()
    } catch (error) {
      console.error('Token verification failed:', error)
      handleLogout()
    }
  }

  const handleLogout = () => {
    clientAPI.logout()
    toast.success('Logged out successfully')
    navigate('/login', { replace: true })
  }

  const toggleMenu = (title) => {
    setExpandedMenus(prev => ({ ...prev, [title]: !prev[title] }))
  }

  const isActive = (path) => location.pathname === path

  return (
    <div className="flex h-screen bg-slate-50">
      <SessionExpiryWarning />
      
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-72' : 'w-20'} bg-white border border-slate-200 border-r shadow-sm transition-all duration-300 flex flex-col`}>
        {sidebarOpen ? (
          <>
            {/* Logo Section - Open */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-white rounded-lg px-3 py-2 inline-block">
                  <img src="/payflux.png" alt="Payflux" className="h-10 w-auto object-contain" />
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent transition-all rounded-xl"
                title="Close sidebar"
              >
                <ChevronLeft size={20} />
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Logo Section - Closed */}
            <div className="p-4 border-b border-slate-200 flex flex-col items-center gap-3">
              <div className="bg-white rounded-lg p-2 inline-block">
                <img src="/favicon.png" alt="Payflux" className="h-8 w-8 object-contain" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent transition-all p-2 rounded-xl"
                title="Open sidebar"
              >
                <ChevronRight size={20} />
              </Button>
            </div>
          </>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
          {menuItems.map((item) => (
            <div key={item.title} className="animate-slide-in">
              {item.submenu ? (
                <div>
                  <button
                    onClick={() => toggleMenu(item.title)}
                    className={`w-full flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'} p-2.5 rounded-2xl transition-all duration-200 hover:bg-blue-50 border border-transparent text-slate-700 hover:text-blue-600 group relative overflow-hidden`}
                    title={!sidebarOpen ? item.title : ''}
                  >
                    <div className={`flex items-center gap-3 relative z-10 ${!sidebarOpen && 'justify-center'}`}>
                      <div className="p-1.5 rounded-xl bg-slate-50 group-hover:bg-blue-100 transition-colors">
                        <item.icon size={18} className="text-slate-500 group-hover:text-blue-600 transition-colors" />
                      </div>
                      {sidebarOpen && <span className="font-medium text-sm">{item.title}</span>}
                    </div>
                    {sidebarOpen && (
                      <ChevronDown
                        size={16}
                        className={`transition-transform duration-300 relative z-10 ${expandedMenus[item.title] ? 'rotate-180' : ''}`}
                      />
                    )}
                  </button>
                  {expandedMenus[item.title] && sidebarOpen && (
                    <div className="ml-6 mt-2 space-y-1 animate-slide-in">
                      {item.submenu.map((subItem) => (
                        <Link
                          key={subItem.path}
                          to={subItem.path}
                          className={`flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 group ${
                            isActive(subItem.path) 
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 scale-[1.02]' 
                              : 'text-slate-600 hover:bg-blue-50 border border-transparent hover:text-blue-600'
                          }`}
                        >
                          <subItem.icon size={16} className="group-hover:scale-110 transition-transform duration-200" />
                          <span className="text-sm font-medium">{subItem.title}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 p-2.5 rounded-2xl transition-all duration-200 group ${
                    isActive(item.path) 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 scale-[1.02]' 
                      : 'text-slate-700 hover:bg-blue-50 border border-transparent hover:text-blue-600'
                  } ${!sidebarOpen && 'justify-center'}`}
                  title={!sidebarOpen ? item.title : ''}
                >
                  <div className={`p-1.5 rounded-xl transition-colors ${
                    isActive(item.path) 
                      ? 'bg-blue-700/50' 
                      : 'bg-slate-50 group-hover:bg-blue-100'
                  }`}>
                    <item.icon size={18} className={`transition-colors ${
                      isActive(item.path) 
                        ? 'text-white' 
                        : 'text-slate-500 group-hover:text-blue-600'
                    }`} />
                  </div>
                  {sidebarOpen && <span className="font-medium text-sm">{item.title}</span>}
                </Link>
              )}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="bg-white border border-slate-200 border-b shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            {/* Search Bar */}
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  placeholder="Search transactions, reports..."
                  className="pl-10 bg-slate-50 border-slate-200 focus:bg-white border focus:border-blue-500 rounded-xl text-slate-900"
                />
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-4 ml-6">
              {/* Notifications */}
              <button className="relative p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent rounded-xl transition-colors">
                <Bell size={22} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User Profile */}
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-800">{merchantInfo.name}</p>
                  <p className="text-xs text-slate-500">{merchantInfo.email}</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-semibold shadow-md">
                  <User size={20} />
                </div>
              </div>

              {/* Logout Button */}
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="flex items-center gap-2 text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 hover:text-rose-500 rounded-xl transition-all duration-200 px-4 py-2"
              >
                <LogOut size={18} />
                <span className="font-medium text-sm">Logout</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {/* PIN Notification */}
          <PinNotification />
          
          <div className="p-6 animate-slide-in">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
