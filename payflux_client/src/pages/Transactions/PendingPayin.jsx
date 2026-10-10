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
    userId: 'TEST_APIPayin02_81000',
    date: '11-02-2026 15:40:49',
    amount: 10000,
    transactionId: 'PAP2202W21C1542821',
    utr: '',
    customerNo: '',
    customerName: '',
    source: 'API',
    commissionCharges: '',
    status: 'Initiated',
    serviceName: 'UPIQR10',
    serviceMessage: 'QR Generated',
    clientTransactionId: 'JAPI/1700498927',
    remarks: '',
    paymentConfirm: 'Success',
    check: 'Check'
  },
]

export default function PendingPayin() {
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
      txn.clientTransactionId.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-3xl font-bold">Pending Pay In</h1>
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
                  <TableHead className="font-bold text-slate-700">DATE</TableHead>
                  <TableHead className="font-bold text-slate-700">AMOUNT</TableHead>
                  <TableHead className="font-bold text-slate-700">TRANSACTION ID</TableHead>
                  <TableHead className="font-bold text-slate-700">UTR</TableHead>
                  <TableHead className="font-bold text-slate-700">CONSUMER NO</TableHead>
                  <TableHead className="font-bold text-slate-700">CONSUMER NAME</TableHead>
                  <TableHead className="font-bold text-slate-700">SOURCE</TableHead>
                  <TableHead className="font-bold text-slate-700">COMMISSION CHARGES</TableHead>
                  <TableHead className="font-bold text-slate-700">STATUS</TableHead>
                  <TableHead className="font-bold text-slate-700">SERVICE NAME</TableHead>
                  <TableHead className="font-bold text-slate-700">SERVICE MESSAGE</TableHead>
                  <TableHead className="font-bold text-slate-700">CLIENT TRANSACTION ID</TableHead>
                  <TableHead className="font-bold text-slate-700">REMARKS</TableHead>
                  <TableHead className="font-bold text-slate-700">PAYMENT CONFIRM</TableHead>
                  <TableHead className="font-bold text-slate-700">CHECK</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={17} className="text-center py-8 text-slate-500 font-medium">
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
                      <TableCell className="whitespace-nowrap text-slate-600">{txn.date}</TableCell>
                      <TableCell className="font-bold text-slate-800">₹{txn.amount.toLocaleString()}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">{txn.transactionId}</TableCell>
                      <TableCell className="text-center text-slate-600">{txn.utr || '-'}</TableCell>
                      <TableCell className="text-center text-slate-600">{txn.customerNo || '-'}</TableCell>
                      <TableCell className="text-center text-slate-600">{txn.customerName || '-'}</TableCell>
                      <TableCell className="text-slate-600">{txn.source}</TableCell>
                      <TableCell className="text-center text-slate-600">{txn.commissionCharges || '-'}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded text-xs font-bold inline-flex items-center gap-1 bg-blue-100 text-blue-700">
                          {txn.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-600">{txn.serviceName}</TableCell>
                      <TableCell className="text-slate-600">{txn.serviceMessage}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">{txn.clientTransactionId}</TableCell>
                      <TableCell className="text-center text-slate-600">{txn.remarks || '-'}</TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleCheck(txn)}
                          className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-xs h-7"
                        >
                          {txn.check}
                        </Button>
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
