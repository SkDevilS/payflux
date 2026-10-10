import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Clock, Download, Check, X, Search } from 'lucide-react'
import { toast } from 'sonner'

const mockPending = [
  { 
    id: 1,
    userId: 'TEST_10f0caa0e2_81667',
    accountNo: '1234567890',
    transactionDate: '14-02-2026 10:30:15',
    amount: 5000,
    status: 'Pending',
    transactionId: 'WM1210WDTC1542819',
    clientTransactionId: 'JAPI/1737827838',
    serviceName: 'IMPS',
    utr: '',
    mode: 'IMPS',
    txnSource: 'API',
    charges: 10,
    updateRefundDate: '',
    message: 'Processing',
    senderName: 'John Doe',
    senderNo: '9876543210',
    remarks: '',
    apiTransId: 'API123456',
    parentId: 'PARENT001',
    state: 'Maharashtra',
    city: 'Mumbai',
    paymentConfirm: true,
    checkStatus: 'Check'
  },
  { 
    id: 2,
    userId: 'TEST_10f0caa0e2_81667',
    accountNo: '0987654321',
    transactionDate: '13-02-2026 15:45:30',
    amount: 10000,
    status: 'Pending',
    transactionId: 'PAY2070W01C1542872',
    clientTransactionId: 'JAPI/1737827971',
    serviceName: 'NEFT',
    utr: '',
    mode: 'NEFT',
    txnSource: 'API',
    charges: 15,
    updateRefundDate: '',
    message: 'Awaiting confirmation',
    senderName: 'Jane Smith',
    senderNo: '9876543211',
    remarks: 'Urgent',
    apiTransId: 'API123457',
    parentId: 'PARENT002',
    state: 'Delhi',
    city: 'New Delhi',
    paymentConfirm: true,
    checkStatus: 'Check'
  },
]

export default function PendingPayout() {
  const [fromDate, setFromDate] = useState('2026-02-01')
  const [toDate, setToDate] = useState('2026-02-13')
  const [transactions, setTransactions] = useState(mockPending)
  const [showFilters, setShowFilters] = useState(false)
  const [entriesPerPage, setEntriesPerPage] = useState(10)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const handleSearch = () => {
    toast.success('Search applied successfully!')
  }

  const handleReset = () => {
    setFromDate('2026-02-01')
    setToDate('2026-02-13')
    setSearchTerm('')
    toast.info('Filters reset')
  }

  const handleExport = () => {
    toast.success('Report exported successfully!')
  }

  const handleCheck = (txn) => {
    toast.info(`Checking transaction ${txn.transactionId}`)
  }

  const handlePaymentConfirm = (txn, action) => {
    if (action === 'Success') {
      toast.success(`Transaction ${txn.transactionId} marked as successful`)
    } else if (action === 'Fail') {
      toast.error(`Transaction ${txn.transactionId} marked as failed`)
    }
  }

  const filteredTransactions = transactions.filter(txn => {
    if (!searchTerm) return true
    return (
      txn.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.clientTransactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.accountNo.includes(searchTerm)
    )
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredTransactions.length / entriesPerPage)
  const startIndex = (currentPage - 1) * entriesPerPage
  const endIndex = startIndex + entriesPerPage
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex)

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Export and Search Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="h-8 w-8 text-orange-400" />
          <h1 className="text-3xl font-bold">Pending Payout</h1>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExport}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
          >
            <Search className="h-4 w-4 mr-2" />
            {showFilters ? 'Hide Filters' : 'Search'}
          </Button>
        </div>
      </div>

      {/* Search Filters - Hidden by default */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Search Filters :</CardTitle>
          </CardHeader>
          <CardContent>
            {/* All filters in one horizontal row with proper alignment */}
            <div className="grid grid-cols-12 gap-4 items-end">
              <div className="col-span-2">
                <Label className="text-sm font-medium">Date</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800"
                >
                  <option value="Date">Date</option>
                </select>
              </div>
              <div className="col-span-3">
                <Label className="text-sm font-medium">From Date</Label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="col-span-3">
                <Label className="text-sm font-medium">To Date</Label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="col-span-2">
                <Button 
                  onClick={handleSearch}
                  className="w-full h-9 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
              <div className="col-span-2">
                <Button 
                  onClick={handleReset}
                  variant="outline"
                  className="w-full h-9"
                >
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction Table */}
      <Card>
        <CardContent className="pt-6">
          {/* Table Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">Show</span>
              <select
                value={entriesPerPage}
                onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                className="flex h-9 w-20 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm text-slate-800"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm">entries</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Search:</span>
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 h-9"
                placeholder="Search..."
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b border-slate-200">
                  <TableHead className="font-bold text-slate-700">
                    <input type="checkbox" className="rounded border-slate-300 text-purple-600 focus:ring-purple-500" />
                  </TableHead>
                  <TableHead className="font-bold text-slate-700">USER ID</TableHead>
                  <TableHead className="font-bold text-slate-700">ACCOUNT NO</TableHead>
                  <TableHead className="font-bold text-slate-700">TRANSACTION DATE</TableHead>
                  <TableHead className="font-bold text-slate-700">AMOUNT</TableHead>
                  <TableHead className="font-bold text-slate-700">STATUS</TableHead>
                  <TableHead className="font-bold text-slate-700">TRANSACTION ID</TableHead>
                  <TableHead className="font-bold text-slate-700">CLIENT TRANSACTION ID</TableHead>
                  <TableHead className="font-bold text-slate-700">SERVICE NAME</TableHead>
                  <TableHead className="font-bold text-slate-700">UTR</TableHead>
                  <TableHead className="font-bold text-slate-700">MODE</TableHead>
                  <TableHead className="font-bold text-slate-700">TXN SOURCE</TableHead>
                  <TableHead className="font-bold text-slate-700">CHARGES</TableHead>
                  <TableHead className="font-bold text-slate-700">UPDATE / REFUND DATE</TableHead>
                  <TableHead className="font-bold text-slate-700">MESSAGE</TableHead>
                  <TableHead className="font-bold text-slate-700">SENDER NAME</TableHead>
                  <TableHead className="font-bold text-slate-700">SENDER NO</TableHead>
                  <TableHead className="font-bold text-slate-700">REMARKS</TableHead>
                  <TableHead className="font-bold text-slate-700">API TRANS ID</TableHead>
                  <TableHead className="font-bold text-slate-700">PARENT ID</TableHead>
                  <TableHead className="font-bold text-slate-700">STATE</TableHead>
                  <TableHead className="font-bold text-slate-700">CITY</TableHead>
                  <TableHead className="font-bold text-slate-700">PAYMENT CONFIRM</TableHead>
                  <TableHead className="font-bold text-slate-700">CHECK STATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={24} className="text-center py-8 text-slate-500 font-medium">
                      No pending transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  currentTransactions.map((txn) => (
                    <TableRow key={txn.id} className="hover:bg-slate-50 border-b border-slate-100">
                      <TableCell>
                        <input type="checkbox" className="rounded border-slate-300 text-purple-600 focus:ring-purple-500" />
                      </TableCell>
                      <TableCell className="font-medium text-slate-700">{txn.userId}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">{txn.accountNo}</TableCell>
                      <TableCell className="whitespace-nowrap text-slate-600">{txn.transactionDate}</TableCell>
                      <TableCell className="font-bold text-slate-800">₹{txn.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded text-xs font-bold inline-flex items-center gap-1 bg-amber-100 text-amber-700">
                          {txn.status}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">{txn.transactionId}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">{txn.clientTransactionId}</TableCell>
                      <TableCell className="text-slate-600">{txn.serviceName}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">{txn.utr || '-'}</TableCell>
                      <TableCell className="text-slate-600">{txn.mode}</TableCell>
                      <TableCell className="text-slate-600">{txn.txnSource}</TableCell>
                      <TableCell className="text-center text-slate-600">{txn.charges ? `₹${txn.charges}` : '-'}</TableCell>
                      <TableCell className="whitespace-nowrap text-slate-600">{txn.updateRefundDate || '-'}</TableCell>
                      <TableCell className="text-slate-600">{txn.message}</TableCell>
                      <TableCell className="text-slate-600">{txn.senderName}</TableCell>
                      <TableCell className="text-slate-600">{txn.senderNo}</TableCell>
                      <TableCell className="text-slate-600">{txn.remarks || '-'}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">{txn.apiTransId}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">{txn.parentId}</TableCell>
                      <TableCell className="text-slate-600">{txn.state}</TableCell>
                      <TableCell className="text-slate-600">{txn.city}</TableCell>
                      <TableCell>
                        {txn.paymentConfirm && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={() => handlePaymentConfirm(txn, 'Success')}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs h-7 px-2"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Success
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handlePaymentConfirm(txn, 'Fail')}
                              className="bg-red-600 hover:bg-red-700 text-white text-xs h-7 px-2"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Fail
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {txn.checkStatus && (
                          <Button
                            size="sm"
                            onClick={() => handleCheck(txn)}
                            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-xs h-7"
                          >
                            {txn.checkStatus}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-slate-500 font-medium">
              Pages {currentPage} / {totalPages || 1}
            </div>
            <div className="flex gap-1">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrevious}
                disabled={currentPage === 1}
                className="text-sm"
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleNext}
                disabled={currentPage === totalPages}
                className="text-sm"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
