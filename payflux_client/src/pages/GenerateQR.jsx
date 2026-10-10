import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { QrCode, Download, Copy, RefreshCw, Loader2, CheckCircle, XCircle, CreditCard, User, Mail, Smartphone, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import clientAPI from '@/api/client_api'
import * as QRCodeLib from 'qrcode'

export default function GenerateQRMudrape() {
  const [formData, setFormData] = useState({
    amount: '',
    orderId: '',
    customerName: '',
    customerMobile: '',
    customerEmail: ''
  })
  const [qrData, setQrData] = useState(null)
  const [qrImage, setQrImage] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState(null)
  const [gateway, setGateway] = useState('PayU')
  const [statusInterval, setStatusInterval] = useState(null)
  const [successToastShown, setSuccessToastShown] = useState(false)

  // Generate a suggested Order ID
  const generateSuggestedOrderId = () => {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000)
    return `ORD${timestamp}${random}`
  }

  useEffect(() => {
    fetchMerchantGateway()
    
    return () => {
      if (statusInterval) {
        clearInterval(statusInterval)
      }
    }
  }, [])

  const fetchMerchantGateway = async () => {
    try {
      const response = await clientAPI.getMerchantGateway('PAYIN')
      if (response.success) {
        setGateway(response.gateway)
      }
    } catch (error) {
      console.error('Failed to fetch gateway:', error)
      setGateway('PayU') // Default to PayU
    }
  }

  const handleGenerate = async (e) => {
    e.preventDefault()
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    if (!formData.orderId || formData.orderId.trim() === '') {
      toast.error('Please enter an Order ID')
      return
    }

    if (!formData.customerMobile || formData.customerMobile.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number')
      return
    }

    if (!formData.customerEmail || !formData.customerEmail.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    try {
      setLoading(true)
      setPaymentStatus(null)
      setSuccessToastShown(false) // Reset the flag when generating new QR

      // Use user-provided Order ID
      const orderId = formData.orderId.trim()

      // First encrypt the payload
      const payload = {
        amount: formData.amount,
        orderid: orderId,
        payee_fname: formData.customerName.split(' ')[0] || formData.customerName,
        payee_lname: formData.customerName.split(' ').slice(1).join(' ') || '',
        payee_mobile: formData.customerMobile,
        payee_email: formData.customerEmail,
        productinfo: 'Payment'
      }
      
      const orderResponse = await clientAPI.createPayinOrder(payload)

      if (!orderResponse.success) {
        toast.error(orderResponse.message || 'Failed to create order')
        return
      }

      const orderData = orderResponse.data
      const paymentData = orderData.payment_link || orderData.qr_string || orderData.upi_link
      
      const isImageUrl = paymentData && (
        paymentData.startsWith('http://') || 
        paymentData.startsWith('https://') ||
        paymentData.includes('.png') ||
        paymentData.includes('.jpg') ||
        paymentData.includes('showQr') ||
        paymentData.includes('qrPath')
      )
      
      if (isImageUrl) {
        // It's an image URL (Tourquest) - use it directly
        setQrImage(paymentData)
        setQrData({
          ...orderData,
          gateway: gateway,
          upiLink: paymentData,
          isImageUrl: true
        })
      } else {
        // It's a UPI string (PayU/Mudrape) - generate QR code
        let qrImageData
        if (gateway === 'PayU') {
          // For PayU, generate payment URL with parameters
          const paymentParams = new URLSearchParams(orderData.payment_params)
          const paymentUrl = `${orderData.payment_url}?${paymentParams.toString()}`
          
          qrImageData = await QRCodeLib.toDataURL(paymentUrl, {
            width: 350,
            margin: 2,
            color: {
              dark: '#0f172a', // Slate 900
              light: '#FFFFFF'
            }
          })
          
          setQrData({
            ...orderData,
            gateway: 'PayU',
            paymentUrl,
            isImageUrl: false
          })
        } else {
          // For Mudrape or others with UPI string
          qrImageData = await QRCodeLib.toDataURL(paymentData, {
            width: 350,
            margin: 2,
            color: {
              dark: '#0f172a',
              light: '#FFFFFF'
            }
          })
          
          setQrData({
            ...orderData,
            gateway: gateway,
            upiLink: paymentData,
            isImageUrl: false
          })
        }
        
        setQrImage(qrImageData)
      }
      
      // Start polling for payment status
      if (gateway === 'Mudrape') {
        startStatusPolling(orderData.order_id, 'order_id')
      } else if (gateway === 'Tourquest') {
        startStatusPolling(orderData.txn_id, 'txn_id')
      } else {
        startStatusPolling(orderData.txn_id, 'txn_id')
      }

      toast.success(`Payment QR generated successfully!`)
    } catch (error) {
      console.error('Generate QR error:', error)
      toast.error(error.message || 'Failed to generate QR code')
    } finally {
      setLoading(false)
    }
  }

  const startStatusPolling = (identifier, identifierType = 'txn_id') => {
    if (statusInterval) {
      clearInterval(statusInterval)
    }

    if (paymentStatus === 'SUCCESS' || paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED') {
      return
    }

    const interval = setInterval(async () => {
      await checkPaymentStatus(identifier, identifierType)
    }, 5000)

    setStatusInterval(interval)
  }

  const checkPaymentStatus = async (identifier = null, identifierType = 'txn_id') => {
    if (!identifier && !qrData) return

    const transactionId = identifier || (gateway === 'Mudrape' ? qrData.order_id : qrData.txn_id)

    try {
      setChecking(true)

      let statusResponse
      
      if (gateway === 'Mudrape') {
        statusResponse = await clientAPI.getMudrapeStatusByOrderId(transactionId)
      } else {
        statusResponse = await clientAPI.getPayinStatus(transactionId)
      }

      if (statusResponse.success) {
        const status = statusResponse.status || statusResponse.transaction?.status

        setPaymentStatus(status)

        if (status === 'SUCCESS') {
          if (statusInterval) {
            clearInterval(statusInterval)
            setStatusInterval(null)
          }
          if (!successToastShown) {
            toast.success('Payment successful!')
            setSuccessToastShown(true)
          }
          setChecking(false)
          return
        } else if (status === 'FAILED' || status === 'CANCELLED') {
          if (statusInterval) {
            clearInterval(statusInterval)
            setStatusInterval(null)
          }
          toast.error('Payment failed')
          setChecking(false)
          return
        }
      }
    } catch (error) {
      console.error('Check status error:', error)
    } finally {
      setChecking(false)
    }
  }

  const handleDownload = () => {
    if (!qrImage) return
    
    const link = document.createElement('a')
    link.href = qrImage
    link.download = `payment-qr-${formData.orderId}.png`
    link.click()
    toast.success('QR Code downloaded!')
  }

  const handleCopyLink = () => {
    if (!qrData) return
    
    const link = gateway === 'Mudrape' ? qrData.upiLink : qrData.paymentUrl
    navigator.clipboard.writeText(link)
    toast.success('Payment link copied to clipboard!')
  }

  const handleReset = () => {
    setQrData(null)
    setQrImage('')
    setPaymentStatus(null)
    setSuccessToastShown(false)
    if (statusInterval) {
      clearInterval(statusInterval)
      setStatusInterval(null)
    }
    setFormData({
      amount: '',
      orderId: '',
      customerName: '',
      customerMobile: '',
      customerEmail: ''
    })
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <QrCode className="h-7 w-7 text-blue-600" />
            Generate Payment Link
          </h1>
          <p className="text-sm text-slate-500 mt-1">Create an instant payment QR code and link for your customers.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full text-sm font-semibold shadow-sm w-fit">
          <RefreshCw className="h-4 w-4" />
          Gateway Active: {gateway}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Section */}
        <div className="lg:col-span-5">
          <Card className="shadow-sm border border-slate-200 bg-white rounded-xl overflow-hidden sticky top-6">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-6 py-5">
              <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Receipt className="h-4 w-4 text-slate-400" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleGenerate} className="space-y-5">
                <div>
                  <Label htmlFor="amount" className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Amount (₹)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      disabled={loading || !!qrData}
                      required
                      className="pl-8 font-semibold text-lg h-12 border-slate-200 shadow-sm focus-visible:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="orderId" className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Order Reference ID</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="orderId"
                        type="text"
                        placeholder="e.g. ORD12345"
                        value={formData.orderId}
                        onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                        disabled={loading || !!qrData}
                        required
                        className="font-mono h-11 border-slate-200 shadow-sm focus-visible:ring-blue-500"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setFormData({ ...formData, orderId: generateSuggestedOrderId() })}
                      disabled={loading || !!qrData}
                      className="h-11 border-slate-200 shadow-sm hover:bg-slate-50 text-slate-600 font-medium"
                    >
                      <RefreshCw className="h-4 w-4 mr-2 text-slate-400" />
                      Auto
                    </Button>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-slate-400 font-medium">Customer Information</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="customerName" className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Customer Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="customerName"
                      type="text"
                      placeholder="John Doe"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      disabled={loading || !!qrData}
                      required
                      className="pl-9 h-11 border-slate-200 shadow-sm focus-visible:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerMobile" className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Mobile</Label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="customerMobile"
                        type="tel"
                        placeholder="9876543210"
                        maxLength="10"
                        value={formData.customerMobile}
                        onChange={(e) => setFormData({ ...formData, customerMobile: e.target.value.replace(/\D/g, '') })}
                        disabled={loading || !!qrData}
                        required
                        className="pl-9 h-11 border-slate-200 shadow-sm focus-visible:ring-blue-500 font-medium"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="customerEmail" className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="customerEmail"
                        type="email"
                        placeholder="john@example.com"
                        value={formData.customerEmail}
                        onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                        disabled={loading || !!qrData}
                        required
                        className="pl-9 h-11 border-slate-200 shadow-sm focus-visible:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  {!qrData ? (
                    <Button type="submit" disabled={loading} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm">
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Processing Request...
                        </>
                      ) : (
                        <>
                          <QrCode className="mr-2 h-5 w-5" />
                          Generate Payment QR & Link
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button type="button" onClick={handleReset} variant="outline" className="w-full h-12 border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold shadow-sm">
                      Create New Collection
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* QR Display Section */}
        <div className="lg:col-span-7">
          <Card className="shadow-sm border border-slate-200 bg-white rounded-xl overflow-hidden h-full flex flex-col">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-6 py-5">
              <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-slate-400" />
                Customer Payment Interface
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex items-center justify-center min-h-[400px]">
              {qrImage ? (
                <div className="w-full h-full p-8 flex flex-col items-center">
                  <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8">
                    <img src={qrImage} alt="Payment QR Code" className="w-64 h-64 mx-auto" />
                    <p className="text-center text-sm font-semibold text-slate-500 mt-4 uppercase tracking-widest">Scan to Pay</p>
                  </div>

                  {/* Payment Status */}
                  <div className="w-full max-w-md mb-8">
                    {paymentStatus ? (
                      <div className={`flex items-center justify-center gap-3 p-4 rounded-xl border ${
                        paymentStatus === 'SUCCESS' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                        paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED' ? 'bg-rose-50 border-rose-200 text-rose-700' :
                        'bg-amber-50 border-amber-200 text-amber-700'
                      }`}>
                        {paymentStatus === 'SUCCESS' ? (
                          <CheckCircle className="h-6 w-6 text-emerald-500" />
                        ) : paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED' ? (
                          <XCircle className="h-6 w-6 text-rose-500" />
                        ) : (
                          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                        )}
                        <div>
                          <p className="font-bold text-sm uppercase tracking-wider">Transaction Status</p>
                          <p className="font-semibold text-lg">{paymentStatus}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-3 p-4 rounded-xl border bg-slate-50 border-slate-200 text-slate-600">
                        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                        <span className="font-semibold text-sm">Awaiting customer payment...</span>
                      </div>
                    )}
                  </div>

                  {/* Transaction Details */}
                  <div className="w-full max-w-md bg-slate-50 border border-slate-100 rounded-xl p-5 mb-8 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Transaction ID</span>
                      <span className="font-mono font-semibold text-slate-700">{qrData.txn_id}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Order Reference</span>
                      <span className="font-mono font-semibold text-slate-700">{qrData.order_id}</span>
                    </div>
                    <div className="border-t border-slate-200 my-2 pt-2 flex justify-between items-center text-sm">
                      <span className="text-slate-600 font-semibold">Total Amount</span>
                      <span className="font-bold text-xl text-slate-900">₹{qrData.amount}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap justify-center gap-3 w-full max-w-md">
                    <Button onClick={handleDownload} variant="outline" className="flex-1 bg-white border-slate-200 shadow-sm text-slate-700 font-medium">
                      <Download className="mr-2 h-4 w-4 text-slate-400" />
                      Save QR
                    </Button>
                    <Button onClick={handleCopyLink} variant="outline" className="flex-1 bg-white border-slate-200 shadow-sm text-slate-700 font-medium">
                      <Copy className="mr-2 h-4 w-4 text-slate-400" />
                      Copy Link
                    </Button>
                    {gateway === 'Mudrape' && paymentStatus !== 'SUCCESS' && paymentStatus !== 'FAILED' && (
                      <Button 
                        onClick={() => checkPaymentStatus()} 
                        variant="secondary"
                        disabled={checking}
                        className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100 font-semibold"
                      >
                        {checking ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        Manually Check Status
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center w-full h-full min-h-[500px]">
                  <div className="h-32 w-32 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center mb-6">
                    <QrCode className="h-12 w-12 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">Ready to generate</h3>
                  <p className="text-slate-500 text-sm max-w-[250px] leading-relaxed">
                    Fill out the payment details on the left to create a secure payment link and QR code.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
