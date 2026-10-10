import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserPlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import adminAPI from '@/api/admin_api'

export default function UserOnboarding() {
  const [schemes, setSchemes] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobile: '',
    schemeId: '',
  })

  useEffect(() => {
    loadSchemes()
  }, [])

  const loadSchemes = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getSchemes()
      if (response.success) {
        setSchemes(response.schemes.filter(s => s.is_active))
      }
    } catch (error) {
      toast.error('Failed to load schemes')
    } finally {
      setLoading(false)
    }
  }

  const generateRandomAadhar = () => Math.floor(100000000000 + Math.random() * 900000000000).toString();
  const generateRandomPan = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = '0123456789';
    let pan = '';
    for(let i=0; i<5; i++) pan += letters.charAt(Math.floor(Math.random() * letters.length));
    for(let i=0; i<4; i++) pan += nums.charAt(Math.floor(Math.random() * nums.length));
    pan += letters.charAt(Math.floor(Math.random() * letters.length));
    return pan;
  };
  const generateRandomAccount = () => Math.floor(1000000000 + Math.random() * 9000000000).toString();
  const generateRandomGST = (pan) => `27${pan}1Z${Math.floor(Math.random() * 10)}`;

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.fullName || !formData.email || !formData.mobile || !formData.schemeId) {
      toast.error('Please fill all required fields')
      return
    }

    try {
      setSubmitting(true)
      
      const submitData = new FormData()
      
      // User actual input
      submitData.append('fullName', formData.fullName)
      submitData.append('email', formData.email)
      submitData.append('mobile', formData.mobile)
      submitData.append('schemeId', formData.schemeId)

      // Random / Dummy Data
      const pan = generateRandomPan();
      submitData.append('dob', '1990-01-01')
      submitData.append('aadharCard', generateRandomAadhar())
      submitData.append('panNo', pan)
      submitData.append('pincode', '110001')
      submitData.append('state', 'Delhi')
      submitData.append('city', 'New Delhi')
      submitData.append('houseNumber', '123')
      submitData.append('address', 'Dummy Address')
      submitData.append('landmark', 'Dummy Landmark')
      submitData.append('merchantType', 'PAYIN')
      submitData.append('accountNum', generateRandomAccount())
      submitData.append('ifscCode', 'SBIN0000001')
      submitData.append('gstNo', generateRandomGST(pan))
      
      const response = await adminAPI.onboardMerchant(submitData)
      
      if (response.success) {
        // Provide the generated credentials right in the toast instead of email
        toast.success(`Merchant created! ID: ${response.merchantId} | Pass: ${response.password}`, {
          duration: 10000, // keep it longer so they can copy it
        })
        
        // Reset form
        setFormData({
          fullName: '',
          email: '',
          mobile: '',
          schemeId: '',
        })
      }
    } catch (error) {
      toast.error(error.message || 'Failed to onboard merchant')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserPlus className="h-8 w-8 text-orange-600" />
          <h1 className="text-3xl font-bold">Add Wallet User</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Onboarding Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Merchant Name *</Label>
                <Input
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Enter merchant name"
                  required
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="m@example.com"
                  required
                />
              </div>
              <div>
                <Label>Mobile Number *</Label>
                <Input
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="Enter mobile number"
                  maxLength={10}
                  required
                />
              </div>
              <div>
                <Label>Choose Scheme *</Label>
                <select
                  value={formData.schemeId}
                  onChange={(e) => setFormData({ ...formData, schemeId: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  required
                  disabled={loading || schemes.length === 0}
                >
                  <option value="">--Select Scheme--</option>
                  {schemes.map(scheme => (
                    <option key={scheme.id} value={scheme.id}>
                      {scheme.scheme_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t">
              <Button
                type="submit"
                disabled={submitting}
                className="bg-gradient-to-r from-orange-500 to-yellow-400 hover:from-orange-600 hover:to-yellow-500 w-32"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving
                  </>
                ) : (
                  'Submit'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
