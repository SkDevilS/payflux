import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  KeyRound, Shield, Copy, 
  Eye, EyeOff, Lock, Loader2,
  RefreshCw, CheckCircle2
} from 'lucide-react'
import { toast } from 'sonner'
import clientAPI from '@/api/client_api'
import PinVerificationDialog from '@/components/PinVerificationDialog'

export default function Credentials() {
  const [loading, setLoading] = useState(true)
  const [credentials, setCredentials] = useState(null)
  const [showAuthKey, setShowAuthKey] = useState(false)
  const [showModuleSecret, setShowModuleSecret] = useState(false)
  const [showAesIv, setShowAesIv] = useState(false)
  const [showAesKey, setShowAesKey] = useState(false)
  
  // PIN verification states
  const [pinVerified, setPinVerified] = useState(false)
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [hasPinSet, setHasPinSet] = useState(true)

  useEffect(() => {
    loadCredentials()
    checkPinStatus()
    
    return () => {
      setPinVerified(false)
      setShowAuthKey(false)
      setShowModuleSecret(false)
      setShowAesIv(false)
      setShowAesKey(false)
    }
  }, [])

  const checkPinStatus = async () => {
    try {
      const response = await clientAPI.checkPinStatus()
      if (response.success) {
        setHasPinSet(response.hasPinSet)
      }
    } catch (error) {
      console.error('Error checking PIN status:', error)
    }
  }

  const loadCredentials = async () => {
    try {
      setLoading(true)
      const response = await clientAPI.getCredentials()
      if (response.success) {
        setCredentials(response.credentials)
      }
    } catch (error) {
      toast.error(error.message || 'Failed to load credentials')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (text, label) => {
    if (!text) return toast.error('No value to copy')
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied successfully!`)
  }

  const handleToggleVisibility = (credentialType) => {
    if (!hasPinSet) {
      toast.error('Please set your transaction PIN first to view credentials', {
        duration: 4000,
        action: {
          label: 'Set PIN',
          onClick: () => window.location.href = '/security/change-pin'
        }
      })
      return
    }

    if (!pinVerified) {
      setPendingAction(credentialType)
      setShowPinDialog(true)
      return
    }

    switch (credentialType) {
      case 'authKey':
        setShowAuthKey(!showAuthKey)
        break
      case 'moduleSecret':
        setShowModuleSecret(!showModuleSecret)
        break
      case 'aesIv':
        setShowAesIv(!showAesIv)
        break
      case 'aesKey':
        setShowAesKey(!showAesKey)
        break
    }
  }

  const handlePinVerified = () => {
    setPinVerified(true)
    
    if (pendingAction) {
      switch (pendingAction) {
        case 'authKey':
          setShowAuthKey(true)
          break
        case 'moduleSecret':
          setShowModuleSecret(true)
          break
        case 'aesIv':
          setShowAesIv(true)
          break
        case 'aesKey':
          setShowAesKey(true)
          break
      }
      setPendingAction(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-slate-500">Retrieving secure credentials...</p>
      </div>
    )
  }

  if (!credentials) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Shield className="h-16 w-16 text-slate-300" />
        <h2 className="text-xl font-semibold text-slate-700">No Credentials Found</h2>
        <Button onClick={loadCredentials} className="bg-blue-600 hover:bg-blue-700">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry Connection
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <KeyRound className="h-7 w-7 text-blue-600" />
            Integration Credentials
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage your API keys and secrets for secure integration.</p>
        </div>
        <Button onClick={loadCredentials} variant="outline" size="sm" className="bg-white shadow-sm border-slate-200 text-slate-600 hover:bg-slate-50 w-fit">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card className="bg-gradient-to-r from-slate-800 to-slate-900 border-none shadow-md overflow-hidden rounded-xl">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <Shield className="h-8 w-8 text-blue-400" />
              </div>
              <div>
                <h3 className="font-bold text-xl text-white mb-1.5 tracking-tight">Production Keys Active</h3>
                <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
                  These credentials provide full access to your production environment. Never expose your module secret or AES keys in client-side code. Keep them secure on your backend server.
                </p>
              </div>
            </div>
            <div className="flex-shrink-0">
              <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Live Environment
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border border-slate-200 bg-white rounded-xl overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-8 py-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2 uppercase tracking-wider">
              <Lock className="h-4 w-4 text-slate-400" />
              Primary Identifiers
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-50/80 border border-slate-200 p-5 rounded-xl">
              <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Merchant ID</p>
              <div className="flex items-center justify-between">
                <p className="font-mono font-bold text-slate-800 text-lg tracking-tight">{credentials.merchant_id}</p>
                <Button variant="ghost" size="sm" onClick={() => handleCopy(credentials.merchant_id, 'Merchant ID')} className="text-slate-400 hover:text-blue-600">
                  <Copy size={16} />
                </Button>
              </div>
            </div>
            <div className="bg-slate-50/80 border border-slate-200 p-5 rounded-xl">
              <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Base URL</p>
              <div className="flex items-center justify-between">
                <p className="font-mono font-medium text-slate-700 text-sm">{credentials.base_url}</p>
                <Button variant="ghost" size="sm" onClick={() => handleCopy(credentials.base_url, 'Base URL')} className="text-slate-400 hover:text-blue-600">
                  <Copy size={16} />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="group">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Authorization Key (Header: X-Authorization-Key)</Label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Input
                    type={showAuthKey ? 'text' : 'password'}
                    value={credentials.authorization_key || 'N/A'}
                    readOnly
                    className="font-mono text-sm border-slate-200 bg-white h-12 shadow-sm pr-12 focus-visible:ring-blue-500"
                  />
                  <button
                    onClick={() => handleToggleVisibility('authKey')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    {showAuthKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <Button variant="outline" size="icon" className="h-12 w-12 border-slate-200 shadow-sm text-slate-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleCopy(credentials.authorization_key, 'Auth Key')}>
                  <Copy size={18} />
                </Button>
              </div>
            </div>

            <div className="group">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Module Secret (Header: X-Module-Secret)</Label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Input
                    type={showModuleSecret ? 'text' : 'password'}
                    value={credentials.module_secret || 'N/A'}
                    readOnly
                    className="font-mono text-sm border-slate-200 bg-white h-12 shadow-sm pr-12 focus-visible:ring-blue-500"
                  />
                  <button
                    onClick={() => handleToggleVisibility('moduleSecret')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    {showModuleSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <Button variant="outline" size="icon" className="h-12 w-12 border-slate-200 shadow-sm text-slate-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleCopy(credentials.module_secret, 'Module Secret')}>
                  <Copy size={18} />
                </Button>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <h4 className="text-sm font-semibold text-slate-800 mb-4">Encryption Parameters</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">AES IV</Label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Input
                        type={showAesIv ? 'text' : 'password'}
                        value={credentials.aes_iv || 'N/A'}
                        readOnly
                        className="font-mono text-sm border-slate-200 bg-white shadow-sm pr-12 focus-visible:ring-blue-500"
                      />
                      <button onClick={() => handleToggleVisibility('aesIv')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
                        {showAesIv ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <Button variant="outline" size="icon" className="border-slate-200 shadow-sm text-slate-500 hover:text-blue-600" onClick={() => handleCopy(credentials.aes_iv, 'AES IV')}>
                      <Copy size={16} />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">AES Key</Label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Input
                        type={showAesKey ? 'text' : 'password'}
                        value={credentials.aes_key || 'N/A'}
                        readOnly
                        className="font-mono text-sm border-slate-200 bg-white shadow-sm pr-12 focus-visible:ring-blue-500"
                      />
                      <button onClick={() => handleToggleVisibility('aesKey')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
                        {showAesKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <Button variant="outline" size="icon" className="border-slate-200 shadow-sm text-slate-500 hover:text-blue-600" onClick={() => handleCopy(credentials.aes_key, 'AES Key')}>
                      <Copy size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <PinVerificationDialog
        open={showPinDialog}
        onOpenChange={setShowPinDialog}
        onVerified={handlePinVerified}
        title="Verify PIN to View Credentials"
      />
    </div>
  )
}

