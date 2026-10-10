import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Building, Eye, EyeOff, RefreshCw, Wallet, PlusCircle, ArrowRightLeft } from 'lucide-react'
import { toast } from 'sonner'
import { clientAPI } from '@/api/client_api'
import { formatCurrency, formatDateTime } from '@/lib/utils'

export default function SettleFund() {
  const [banks, setBanks] = useState([])
  const [loadingBanks, setLoadingBanks] = useState(true)
  const [walletBalance, setWalletBalance] = useState(0)
  const [transactions, setTransactions] = useState([])
  
  // Settle form states
  const [selectedBank, setSelectedBank] = useState('')
  const [amount, setAmount] = useState('')
  const [tpin, setTpin] = useState('')
  const [showTpin, setShowTpin] = useState(false)
  const [loadingSettle, setLoadingSettle] = useState(false)

  // Add Bank form states
  const [bankName, setBankName] = useState('')
  const [accountNo, setAccountNo] = useState('')
  const [reAccountNo, setReAccountNo] = useState('')
  const [ifscCode, setIfscCode] = useState('')
  const [branchName, setBranchName] = useState('')
  const [accountHolderName, setAccountHolderName] = useState('')
  const [addBankTpin, setAddBankTpin] = useState('')
  const [showAddBankTpin, setShowAddBankTpin] = useState(false)
  const [loadingAddBank, setLoadingAddBank] = useState(false)

  useEffect(() => {
    fetchBanks()
    fetchWalletBalance()
    fetchTransactions()
  }, [])

  const fetchBanks = async () => {
    try {
      setLoadingBanks(true)
      const response = await clientAPI.getMerchantBanks()
      if (response.success) {
        const bankList = response.banks || response.data || []
        const activeBanks = bankList.filter(bank => bank.is_active)
        setBanks(activeBanks)
      } else {
        toast.error('Failed to load bank accounts')
      }
    } catch (error) {
      console.error('Error fetching banks:', error)
      toast.error('Failed to load bank accounts')
    } finally {
      setLoadingBanks(false)
    }
  }

  const fetchWalletBalance = async () => {
    try {
      const response = await clientAPI.getWalletOverview()
      if (response.success) {
        setWalletBalance(response.data.balance || 0)
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error)
    }
  }

  const fetchTransactions = async () => {
    try {
      const response = await clientAPI.getClientWalletStatement()
      if (response.success) {
        setTransactions(response.data)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }

  const handleSettle = async (e) => {
    e.preventDefault()
    
    if (!selectedBank) return toast.error('Please select a bank account')
    if (!amount || parseFloat(amount) <= 0) return toast.error('Please enter a valid amount')
    if (parseFloat(amount) > walletBalance) return toast.error('Insufficient balance in wallet')
    if (!tpin || tpin.length !== 6) return toast.error('Please enter a valid 6-digit TPIN')
    
    setLoadingSettle(true)
    try {
      const response = await clientAPI.settleFund({
        bank_id: selectedBank,
        amount: parseFloat(amount),
        tpin: tpin
      })
      
      if (response.success) {
        const chargeInfo = response.charges 
          ? ` Charges: ₹${response.charges}, Amount to Bank: ₹${response.net_amount}` 
          : ''
        toast.success(`Settlement initiated!${chargeInfo}`)
        handleResetSettle()
        fetchWalletBalance()
        fetchTransactions()
      } else {
        toast.error(response.message || 'Settlement failed')
      }
    } catch (error) {
      toast.error(error.message || 'An error occurred')
    } finally {
      setLoadingSettle(false)
    }
  }

  const handleAddBank = async (e) => {
    e.preventDefault()
    
    if (banks.length >= 5) return toast.error('Maximum 5 banks allowed')
    if (!bankName) return toast.error('Please select a bank name')
    if (!accountNo) return toast.error('Please enter account number')
    if (accountNo !== reAccountNo) return toast.error('Account numbers do not match')
    if (!ifscCode) return toast.error('Please enter IFSC code')
    if (!branchName) return toast.error('Please enter branch name')
    if (!accountHolderName) return toast.error('Please enter account holder name')
    if (!addBankTpin || addBankTpin.length !== 6) return toast.error('Please enter valid 6-digit TPIN')
    
    setLoadingAddBank(true)
    try {
      const response = await clientAPI.addBank({
        bankName,
        accountNumber: accountNo,
        reAccountNumber: reAccountNo,
        ifscCode,
        branchName,
        accountHolderName,
        tpin: addBankTpin
      })
      
      if (response.success) {
        toast.success('Bank account added successfully!')
        handleResetAddBank()
        fetchBanks()
      }
    } catch (error) {
      toast.error(error.message || 'Failed to add bank account')
    } finally {
      setLoadingAddBank(false)
    }
  }

  const handleResetSettle = () => {
    setSelectedBank('')
    setAmount('')
    setTpin('')
  }

  const handleResetAddBank = () => {
    setBankName('')
    setAccountNo('')
    setReAccountNo('')
    setIfscCode('')
    setBranchName('')
    setAccountHolderName('')
    setAddBankTpin('')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ArrowRightLeft className="h-8 w-8 text-orange-400" />
        <h1 className="text-3xl font-bold">IMPS Payout</h1>
      </div>

      {/* Wallet Balance Card */}
      <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm mb-1">Available Wallet Balance</p>
              <p className="text-3xl font-bold">₹{walletBalance.toLocaleString()}</p>
            </div>
            <div className="bg-white/20 border border-white/30 p-3 rounded-full">
              <Wallet className="h-8 w-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="settle" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="settle">Settle Fund</TabsTrigger>
          <TabsTrigger value="add-bank">Add New Bank</TabsTrigger>
        </TabsList>
        
        <TabsContent value="settle" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Settle Fund to Bank Account</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSettle} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-base font-medium mb-2 block">Select Bank Account</Label>
                    {loadingBanks ? (
                      <div className="flex h-12 w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-base items-center text-slate-500">
                        Loading banks...
                      </div>
                    ) : banks.length === 0 ? (
                      <div className="flex h-12 w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-base items-center text-slate-500">
                        No bank accounts found. Please add a bank.
                      </div>
                    ) : (
                      <select
                        value={selectedBank}
                        onChange={(e) => setSelectedBank(e.target.value)}
                        className="flex h-12 w-full rounded-md border border-slate-200 bg-white px-4 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-slate-800"
                        required
                      >
                        <option value="">-- Select Bank Account --</option>
                        {banks.map((bank) => (
                          <option key={bank.id} value={bank.id}>
                            {bank.bank_name} - {bank.account_holder_name} - ****{bank.account_number.slice(-4)}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <Label className="text-base font-medium mb-2 block">Amount</Label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-12 text-base"
                      required
                      min="1"
                      step="0.01"
                      max={walletBalance}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-base font-medium mb-2 block">TPIN</Label>
                    <div className="relative">
                      <Input
                        type={showTpin ? 'text' : 'password'}
                        placeholder="Enter 6-digit TPIN"
                        value={tpin}
                        onChange={(e) => setTpin(e.target.value)}
                        className="h-12 text-base pr-12"
                        required
                        maxLength="6"
                        pattern="[0-9]{6}"
                      />
                      <button
                        type="button"
                        onClick={() => setShowTpin(!showTpin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                      >
                        {showTpin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={loadingSettle}
                    className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white px-8 h-11"
                  >
                    {loadingSettle ? 'Processing...' : 'Settle Fund'}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleResetSettle}
                    variant="outline"
                    className="bg-gray-400 hover:bg-gray-500 text-white px-8 h-11 border-0"
                  >
                    Reset
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add-bank" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Add New Bank Account</CardTitle>
            </CardHeader>
            <CardContent>
              {banks.length >= 5 && (
                <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    You have reached the maximum limit of 5 active banks. Please delete a bank from Bank Lists to add a new one.
                  </p>
                </div>
              )}
              <form onSubmit={handleAddBank} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label className="text-base font-medium mb-2 block">Bank Name</Label>
                    <Input
                      type="text"
                      placeholder="Enter Bank Name"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="h-12 text-base"
                      required
                      disabled={loadingAddBank}
                    />
                  </div>

                  <div>
                    <Label className="text-base font-medium mb-2 block">Account No</Label>
                    <Input
                      type="text"
                      placeholder="Enter Account No"
                      value={accountNo}
                      onChange={(e) => setAccountNo(e.target.value)}
                      className="h-12 text-base"
                      required
                      disabled={loadingAddBank}
                    />
                  </div>

                  <div>
                    <Label className="text-base font-medium mb-2 block">Re-Enter Account No</Label>
                    <Input
                      type="text"
                      placeholder="Re-Enter Account No"
                      value={reAccountNo}
                      onChange={(e) => setReAccountNo(e.target.value)}
                      className="h-12 text-base"
                      required
                      disabled={loadingAddBank}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label className="text-base font-medium mb-2 block">IFSC Code</Label>
                    <Input
                      type="text"
                      placeholder="Enter IFSC Code"
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                      className="h-12 text-base"
                      required
                      disabled={loadingAddBank}
                    />
                  </div>

                  <div>
                    <Label className="text-base font-medium mb-2 block">Branch Name</Label>
                    <Input
                      type="text"
                      placeholder="Branch Name"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      className="h-12 text-base"
                      required
                      disabled={loadingAddBank}
                    />
                  </div>

                  <div>
                    <Label className="text-base font-medium mb-2 block">Account Holder Name</Label>
                    <Input
                      type="text"
                      placeholder="Enter Account Holder Name"
                      value={accountHolderName}
                      onChange={(e) => setAccountHolderName(e.target.value)}
                      className="h-12 text-base"
                      required
                      disabled={loadingAddBank}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label className="text-base font-medium mb-2 block">TPIN</Label>
                    <div className="relative">
                      <Input
                        type={showAddBankTpin ? 'text' : 'password'}
                        placeholder="TPIN"
                        value={addBankTpin}
                        onChange={(e) => setAddBankTpin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="h-12 text-base pr-12"
                        required
                        maxLength="6"
                        disabled={loadingAddBank}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAddBankTpin(!showAddBankTpin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                      >
                        {showAddBankTpin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-8 h-11"
                    disabled={loadingAddBank || banks.length >= 5}
                  >
                    {loadingAddBank ? 'Submitting...' : 'Add Bank'}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleResetAddBank}
                    variant="outline"
                    className="bg-gray-400 hover:bg-gray-500 text-white px-8 h-11 border-0"
                    disabled={loadingAddBank}
                  >
                    Reset
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transaction History</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchTransactions}
              className="text-slate-600 hover:text-slate-900"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Balance Before</TableHead>
                  <TableHead>Balance After</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-500 font-medium">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="font-medium">{txn.txn_id}</TableCell>
                      <TableCell>
                        <Badge className={txn.txn_type === 'CREDIT' ? 'bg-green-100 text-emerald-500' : 'bg-red-100 text-rose-500'}>
                          {txn.txn_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(txn.amount)}</TableCell>
                      <TableCell>{formatCurrency(txn.balance_before)}</TableCell>
                      <TableCell>{formatCurrency(txn.balance_after)}</TableCell>
                      <TableCell>{txn.description}</TableCell>
                      <TableCell>{formatDateTime(txn.created_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card className="bg-slate-50 border border-slate-200 shadow-sm">
        <CardContent className="pt-6">
          <h3 className="font-bold text-slate-800 mb-2">Important Information</h3>
          <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
            <li>Payout charges will be deducted from the settlement amount as per your scheme</li>
            <li>Example: If you settle ₹100 with ₹10 charges, ₹100 is deducted from wallet and ₹90 goes to bank</li>
            <li>Funds will be transferred to your selected bank account</li>
            <li>TPIN is required for security verification</li>
            <li>Settlement may take 1-2 business days</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
