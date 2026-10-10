import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Building, Eye, EyeOff, RefreshCw, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { toast } from 'sonner'
import clientAPI from '@/api/client_api'

export default function BankManagement() {
  const [loading, setLoading] = useState(false)
  const [loadingBanks, setLoadingBanks] = useState(true)
  const [banks, setBanks] = useState([])
  
  // Form states moved to SettleFund.jsx
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingBank, setDeletingBank] = useState(null)
  const [deleteTpin, setDeleteTpin] = useState('')
  const [showDeleteTpin, setShowDeleteTpin] = useState(false)

  useEffect(() => {
    loadBanks()
  }, [])

  const loadBanks = async () => {
    try {
      setLoadingBanks(true)
      const response = await clientAPI.getBanks()
      if (response.success) {
        setBanks(response.banks || [])
      }
    } catch (error) {
      toast.error('Failed to load banks')
      console.error('Load banks error:', error)
    } finally {
      setLoadingBanks(false)
    }
  }



  const handleDeleteClick = (bank) => {
    setDeletingBank(bank)
    setDeleteTpin('')
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTpin || deleteTpin.length !== 6) {
      toast.error('Please enter valid 6-digit TPIN')
      return
    }
    
    try {
      const response = await clientAPI.deleteBank(deletingBank.id, deleteTpin)
      if (response.success) {
        toast.success('Bank deleted successfully!')
        setShowDeleteDialog(false)
        setDeletingBank(null)
        setDeleteTpin('')
        loadBanks()
      }
    } catch (error) {
      toast.error(error.message || 'Failed to delete bank')
    }
  }

  const handleToggleStatus = async (bank) => {
    try {
      const response = await clientAPI.toggleBankStatus(bank.id)
      if (response.success) {
        toast.success(response.message)
        loadBanks()
      }
    } catch (error) {
      toast.error(error.message || 'Failed to toggle bank status')
    }
  }

  const getStatusBadge = (isActive) => {
    return isActive ? (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 font-bold">Active</Badge>
    ) : (
      <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 font-bold">Inactive</Badge>
    )
  }

  const getSettlementStatusBadge = (status) => {
    const statusConfig = {
      'PENDING': { bg: 'bg-yellow-100', text: 'text-amber-500' },
      'APPROVED': { bg: 'bg-green-100', text: 'text-emerald-500' },
      'REJECTED': { bg: 'bg-red-100', text: 'text-rose-500' }
    }
    
    const config = statusConfig[status] || statusConfig['PENDING']
    return (
      <Badge className={`${config.bg} ${config.text} hover:${config.bg}`}>
        {status}
      </Badge>
    )
  }

  return (
    <>
      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Bank Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this bank account? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Enter TPIN to confirm</Label>
            <div className="relative mt-2">
              <Input
                type={showDeleteTpin ? 'text' : 'password'}
                placeholder="Enter 6-digit TPIN"
                value={deleteTpin}
                onChange={(e) => setDeleteTpin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength="6"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowDeleteTpin(!showDeleteTpin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
              >
                {showDeleteTpin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Building className="h-8 w-8 text-orange-400" />
          <h1 className="text-3xl font-bold">Bank Lists</h1>
        </div>

        {/* Bank List Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Bank List</h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-600 hover:text-slate-900"
                onClick={loadBanks}
                disabled={loadingBanks}
              >
                <RefreshCw className={`h-4 w-4 ${loadingBanks ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Note */}
            <div className="mb-4 space-y-1">
              <p className="text-sm text-slate-700"><span className="font-semibold">Note:</span></p>
              <p className="text-sm text-slate-600">1. Maximum 5 banks allowed to add.</p>
              <p className="text-sm text-slate-600">2. You can activate or deactivate your bank accounts.</p>
            </div>

            {loadingBanks ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
                  <p className="mt-4 text-slate-500 font-medium">Loading banks...</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-b border-slate-200">
                      <TableHead className="whitespace-nowrap font-bold text-slate-700">SR. NO.</TableHead>
                      <TableHead className="whitespace-nowrap font-bold text-slate-700">NAME</TableHead>
                      <TableHead className="whitespace-nowrap font-bold text-slate-700">ACCOUNT NO</TableHead>
                      <TableHead className="whitespace-nowrap font-bold text-slate-700">IFSC</TableHead>
                      <TableHead className="whitespace-nowrap font-bold text-slate-700">BANK NAME</TableHead>
                      <TableHead className="whitespace-nowrap font-bold text-slate-700">BRANCH NAME</TableHead>
                      <TableHead className="whitespace-nowrap font-bold text-slate-700">STATUS</TableHead>
                      <TableHead className="whitespace-nowrap font-bold text-slate-700">ACTIONS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {banks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-slate-500 font-medium">
                          No bank accounts found
                        </TableCell>
                      </TableRow>
                    ) : (
                      banks.map((bank, index) => (
                        <TableRow key={bank.id} className="hover:bg-slate-50 border-b border-slate-100">
                          <TableCell className="text-slate-600">{index + 1}</TableCell>
                          <TableCell className="font-medium text-slate-800">{bank.account_holder_name}</TableCell>
                          <TableCell className="font-mono text-slate-600">{bank.account_number}</TableCell>
                          <TableCell className="font-mono text-slate-600">{bank.ifsc_code}</TableCell>
                          <TableCell className="max-w-xs text-slate-700">{bank.bank_name}</TableCell>
                          <TableCell className="text-slate-600">{bank.branch_name}</TableCell>
                          <TableCell>{getStatusBadge(bank.is_active)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={() => handleToggleStatus(bank)}
                                variant="ghost"
                                size="sm"
                                className={bank.is_active 
                                  ? "text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200" 
                                  : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-emerald-200"}
                                title={bank.is_active ? 'Deactivate' : 'Activate'}
                              >
                                {bank.is_active ? (
                                  <ToggleRight className="h-5 w-5" />
                                ) : (
                                  <ToggleLeft className="h-5 w-5" />
                                )}
                              </Button>
                              <Button
                                onClick={() => handleDeleteClick(bank)}
                                variant="ghost"
                                size="sm"
                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
