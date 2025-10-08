import React, { useState } from 'react'
import { Settings, LogOut, Key, X, Download, AlertTriangle, Trash2, Package, BarChart3, ChefHat } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'

const AccountSettings = ({ onPasswordChange, onDataExport, onAccountDelete }) => {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match')
      return
    }
    onPasswordChange(passwordData)
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setShowPasswordForm(false)
  }

  const handleDeleteAccount = () => {
    if (deleteConfirmText === 'DELETE MY ACCOUNT') {
      onAccountDelete()
    } else {
      alert('Please type "DELETE MY ACCOUNT" to confirm')
    }
  }

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out?')) {
      await signOut()
      navigate('/login')
    }
  }

  const exportOptions = [
    {
      type: 'complete',
      title: 'Complete Profile Data',
      description: 'Export all your personal data including profile, settings, inventory, analytics, and recipes (GDPR compliance)',
      icon: Download
    }
  ]

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Account Settings</h2>
      </div>

      <div className="space-y-6">
        {/* Session Management Section */}
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Session Management</h3>
              <p className="text-sm text-muted-foreground">Manage your current session and logout</p>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Password Change Section */}
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-medium">Password & Security</h3>
              <p className="text-sm text-muted-foreground">Manage your account password and security settings</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowPasswordForm(!showPasswordForm)}
            >
              {showPasswordForm ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  Change Password
                </>
              )}
            </Button>
          </div>

          {showPasswordForm && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">
                  Update Password
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowPasswordForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Data Export Section */}
        <div className="border border-border rounded-lg p-4">
          <div className="mb-4">
            <h3 className="font-medium">Data Export & Portability</h3>
            <p className="text-sm text-muted-foreground">Download a complete copy of your personal data</p>
          </div>

          {exportOptions.map((option) => {
            const IconComponent = option.icon
            return (
              <div key={option.type} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  <IconComponent className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{option.title}</div>
                    <div className="text-sm text-muted-foreground mt-1">{option.description}</div>
                    <p className="text-xs text-muted-foreground mt-2">
                      For specific reports (inventory, analytics, recipes), visit the <a href="/reports" className="text-primary hover:underline">Reports page</a>
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => onDataExport(option.type)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export All Data
                </Button>
              </div>
            )
          })}</div>

        {/* Account Deletion Section */}
        <div className="border-2 border-red-500 rounded-lg p-4 bg-red-500/5">
          <div className="mb-4">
            <h3 className="font-medium text-red-600">Danger Zone</h3>
            <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data</p>
          </div>

          {!showDeleteConfirm ? (
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Account
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="bg-background p-4 rounded-lg border border-red-500">
                <div className="flex items-start gap-3 mb-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-red-600 mb-2">Are you absolutely sure?</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Type <strong>DELETE MY ACCOUNT</strong> in the box below to confirm.
                    </p>
                  </div>
                </div>
                <Input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE MY ACCOUNT"
                  className="mb-3"
                />
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== 'DELETE MY ACCOUNT'}
                  >
                    Delete Account
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setDeleteConfirmText('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export default AccountSettings

