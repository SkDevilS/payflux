import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import clientAPI from '../../api/client_api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Search, Download, RefreshCw, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';

export default function PayinReport() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    fetchTransactions();
  }, [pagination.page]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };

      if (statusFilter) {
        params.status = statusFilter;
      }
      if (searchTerm) {
        params.search = searchTerm;
      }
      if (fromDate) {
        params.from_date = fromDate;
      }
      if (toDate) {
        params.to_date = toDate;
      }

      const response = await clientAPI.getPayinTransactions(params);
      
      if (response.success) {
        setTransactions(response.transactions);
        setPagination(prev => ({
          ...prev,
          ...response.pagination
        }));
      }
    } catch (error) {
      toast.error('Failed to load transactions');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const viewDetails = (txn) => {
    setSelectedTxn(txn);
    setShowDetails(true);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      SUCCESS: { color: 'bg-green-500', text: 'Success' },
      PENDING: { color: 'bg-yellow-500', text: 'Pending' },
      INITIATED: { color: 'bg-blue-500', text: 'Initiated' },
      FAILED: { color: 'bg-red-500', text: 'Failed' },
      CANCELLED: { color: 'bg-gray-500', text: 'Cancelled' }
    };

    const config = statusConfig[status] || { color: 'bg-gray-500', text: status };
    
    return (
      <Badge className={config.color}>
        {config.text}
      </Badge>
    );
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // No client-side filtering - backend handles everything
  const filteredTransactions = transactions;

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setFromDate('');
    setToDate('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const exportToCSV = async (type = 'current') => {
    try {
      setDownloading(true);
      let data = [];

      if (type === 'all') {
        const params = {};
        if (statusFilter) params.status = statusFilter;
        if (searchTerm) params.search = searchTerm;
        if (fromDate) params.from_date = fromDate;
        if (toDate) params.to_date = toDate;

        const response = await clientAPI.getAllPayinTransactions(params);
        if (response.success) {
          data = response.transactions || response.data || [];
        }
      } else if (type === 'today') {
        const response = await clientAPI.getTodayPayinTransactions();
        if (response.success) {
          data = response.transactions || response.data || [];
        }
      } else if (type === 'filtered') {
        const hasFilters = statusFilter || searchTerm || fromDate || toDate;
        
        if (!hasFilters) {
          toast.info('No filters applied. Use "Export All" to download all transactions.');
          setDownloading(false);
          return;
        }

        const params = {};
        if (statusFilter) params.status = statusFilter;
        if (searchTerm) params.search = searchTerm;
        if (fromDate) params.from_date = fromDate;
        if (toDate) params.to_date = toDate;

        const response = await clientAPI.getAllPayinTransactions(params);
        if (response.success) {
          data = response.transactions || response.data || [];
        }
      } else {
        data = filteredTransactions;
      }

      if (!data || data.length === 0) {
        toast.info('No transactions to export');
        return;
      }

      const headers = ['Transaction ID', 'Order ID', 'Amount', 'Charge', 'Net Amount', 'Status', 'Payment Mode', 'Date', 'UTR'];
      const rows = data.map(txn => [
        txn.txn_id,
        txn.order_id,
        txn.amount,
        txn.charge_amount,
        txn.net_amount,
        txn.status,
        txn.payment_mode || '-',
        formatDate(txn.created_at),
        txn.utr || txn.bank_ref_no || '-'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = type === 'today' 
        ? `payin-report-today-${new Date().toISOString().split('T')[0]}.csv`
        : type === 'all'
        ? `payin-report-all-${new Date().toISOString().split('T')[0]}.csv`
        : type === 'filtered'
        ? `payin-report-filtered-${new Date().toISOString().split('T')[0]}.csv`
        : `payin-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Exported ${data.length} transactions`);
    } catch (error) {
      toast.error('Failed to export data');
      console.error(error);
    } finally {
      setDownloading(false);
    }
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading transactions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Payin Report</h1>
          <p className="text-slate-400 mt-1">
            View all your payin transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchTransactions}
            disabled={loading}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => exportToCSV('current')}
            disabled={downloading}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Page
          </Button>
          <Button
            onClick={() => exportToCSV('filtered')}
            disabled={downloading || (!statusFilter && !searchTerm && !fromDate && !toDate)}
            variant="outline"
            className="bg-blue-500/10 border border-blue-500/20 hover:bg-blue-100 border-blue-200 disabled:opacity-50 text-blue-500"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Filtered
          </Button>
          <Button
            onClick={() => exportToCSV('all')}
            disabled={downloading}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
          <Button
            onClick={() => exportToCSV('today')}
            disabled={downloading}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Today's Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-slate-400">Total Transactions</div>
            <div className="text-2xl font-bold">{pagination.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-slate-400">Success</div>
            <div className="text-2xl font-bold text-emerald-400">
              {transactions.filter(t => t.status === 'SUCCESS').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-slate-400">Pending</div>
            <div className="text-2xl font-bold text-amber-400">
              {transactions.filter(t => t.status === 'PENDING' || t.status === 'INITIATED').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-slate-400">Failed</div>
            <div className="text-2xl font-bold text-rose-400">
              {transactions.filter(t => t.status === 'FAILED').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 gap-4 items-end">
            <div className="col-span-3">
              <label className="text-sm font-medium mb-1 block">Search</label>
              <Input
                placeholder="Search by TXN ID, Order ID, Mobile..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium mb-1 block">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-md shadow-black/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Status</option>
                <option value="SUCCESS">Success</option>
                <option value="PENDING">Pending</option>
                <option value="INITIATED">Initiated</option>
                <option value="FAILED">Failed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium mb-1 block">From Date</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium mb-1 block">To Date</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="col-span-2">
              <Button 
                onClick={() => {
                  setPagination(prev => ({ ...prev, page: 1 }));
                  fetchTransactions();
                  toast.success('Search applied successfully!');
                }}
                disabled={loading}
                className="w-full h-9 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
              >
                Search
              </Button>
            </div>
            <div className="col-span-1">
              <Button 
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                  setFromDate('');
                  setToDate('');
                  setPagination(prev => ({ ...prev, page: 1 }));
                  setTimeout(() => fetchTransactions(), 0);
                  toast.info('Filters reset');
                }}
                disabled={loading}
                variant="outline"
                className="w-full h-9"
              >
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Charge</TableHead>
                  <TableHead>Net Amount</TableHead>
                  <TableHead>UTR</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-slate-400">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((txn) => (
                    <TableRow key={txn.txn_id}>
                      <TableCell className="font-mono text-sm">{txn.txn_id}</TableCell>
                      <TableCell className="font-mono text-sm">{txn.order_id}</TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm">{txn.payee_name}</div>
                          <div className="text-xs text-slate-400">{txn.payee_mobile}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{formatAmount(txn.amount)}</TableCell>
                      <TableCell className="text-rose-400">
                        -{formatAmount(txn.charge_amount)}
                      </TableCell>
                      <TableCell className="font-semibold text-emerald-400">
                        {formatAmount(txn.net_amount)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {txn.bank_ref_no || txn.utr || '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(txn.status)}</TableCell>
                      <TableCell className="text-sm">{formatDate(txn.created_at)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => viewDetails(txn)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-slate-400">
                Page {pagination.page} of {pagination.pages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === pagination.pages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTxn && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-slate-400">Transaction ID</div>
                  <div className="font-mono text-sm">{selectedTxn.txn_id}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Order ID</div>
                  <div className="font-mono text-sm">{selectedTxn.order_id}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Status</div>
                  <div>{getStatusBadge(selectedTxn.status)}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Payment Mode</div>
                  <div>{selectedTxn.payment_mode || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Amount</div>
                  <div className="font-semibold">{formatAmount(selectedTxn.amount)}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Charge Amount</div>
                  <div className="text-rose-400">-{formatAmount(selectedTxn.charge_amount)}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Net Amount</div>
                  <div className="font-semibold text-emerald-400">{formatAmount(selectedTxn.net_amount)}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Charge Type</div>
                  <div>{selectedTxn.charge_type}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">UTR Number</div>
                  <div className="font-mono text-sm">{selectedTxn.bank_ref_no || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Customer Name</div>
                  <div>{selectedTxn.payee_name}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Customer Mobile</div>
                  <div>{selectedTxn.payee_mobile}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Created At</div>
                  <div>{formatDate(selectedTxn.created_at)}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Completed At</div>
                  <div>{formatDate(selectedTxn.completed_at)}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
