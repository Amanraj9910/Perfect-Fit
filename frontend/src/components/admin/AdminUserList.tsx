import { useState } from 'react'
import { toast } from "sonner"
import { useAdminUsers, useUpdateUserRole, useDeleteUser } from '@/lib/hooks/use-admin-queries'
import { uiLogger } from '@/lib/logger'
import { Loader2, Search, ArrowLeft, ArrowRight, AlertCircle, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SecureAvatar } from '@/components/ui/secure-avatar'
import { useDebounce } from '@/lib/use-debounce'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

interface AdminUserListProps {
    readonly?: boolean
}

export default function AdminUserList({ readonly = false }: AdminUserListProps) {
    const [page, setPage] = useState(1)
    const [searchTerm, setSearchTerm] = useState('')
    const debouncedSearch = useDebounce(searchTerm, 500)
    const [userToDelete, setUserToDelete] = useState<string | null>(null)

    // Use React Query for data fetching and caching
    const { data, isLoading, error } = useAdminUsers(page, debouncedSearch)
    const updateRoleMutation = useUpdateUserRole()
    const deleteUserMutation = useDeleteUser()

    const users = data?.users || []
    const totalPages = Math.ceil((data?.total || 0) / 10) || 1

    const handleRoleUpdate = async (userId: string, newRole: string) => {
        try {
            await updateRoleMutation.mutateAsync({ userId, role: newRole })
            toast.success("User role updated")
        } catch (error) {
            console.error(error)
            toast.error('Failed to update role')
        }
    }

    const confirmDelete = async () => {
        if (!userToDelete) return
        try {
            await deleteUserMutation.mutateAsync(userToDelete)
            setUserToDelete(null)
            toast.success("User deleted successfully")
        } catch (error) {
            console.error(error)
            toast.error('Failed to delete user')
        }
    }

    const ROLE_COLORS: Record<string, string> = {
        candidate: 'bg-gray-100 text-gray-800',
        employee: 'bg-blue-100 text-blue-800',
        hr: 'bg-purple-100 text-purple-800',
        recruiter: 'bg-green-100 text-green-800',
        admin: 'bg-red-100 text-red-800'
    }

    // ... (rest of the component)

    return (
        <div className="space-y-4">
            {/* Search and List UI... */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search by name or email..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-md border bg-white">
                {isLoading ? (
                    <div className="p-8 text-center text-muted-foreground flex justify-center">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : (
                    <div className="divide-y">
                        {users.map((user: any) => (
                            <div key={user.id} className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-3">
                                    <SecureAvatar
                                        src={user.avatar_url}
                                        fallback={user.email[0].toUpperCase()}
                                        className="h-8 w-8"
                                    />
                                    <div className="grid gap-0.5">
                                        <p className="font-medium">{user.full_name || 'No Name'}</p>
                                        <p className="text-sm text-muted-foreground">{user.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[user.role] || 'bg-gray-100'}`}>
                                        {user.role}
                                    </span>
                                    {!readonly && (
                                        <>
                                            <Select
                                                value={user.role}
                                                onValueChange={(val) => handleRoleUpdate(user.id, val)}
                                                disabled={updateRoleMutation.isPending}
                                            >
                                                <SelectTrigger className="w-[130px]">
                                                    {updateRoleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SelectValue />}
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="candidate">Candidate</SelectItem>
                                                    <SelectItem value="employee">Employee</SelectItem>
                                                    <SelectItem value="hr">HR</SelectItem>
                                                    <SelectItem value="recruiter">Recruiter</SelectItem>
                                                    <SelectItem value="admin">Admin</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setUserToDelete(user.id)}
                                                disabled={deleteUserMutation.isPending || user.role === 'admin'}
                                                className="text-muted-foreground hover:text-red-600 w-8 h-8"
                                                title="Delete User"
                                            >
                                                {deleteUserMutation.isPending && userToDelete === user.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                        {users.length === 0 && (
                            <div className="p-8 text-center text-muted-foreground">No users found.</div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between">
                <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" /> Previous
                </Button>
                <div className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                </div>
                <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                >
                    Next <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
            </div>

            <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Are you absolutely sure?</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. This will permanently delete the user account
                            and remove their data from our servers.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setUserToDelete(null)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={deleteUserMutation.isPending}
                        >
                            {deleteUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Delete Account"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
