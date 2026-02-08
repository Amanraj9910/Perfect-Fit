import { useState } from 'react'
import { useAdminUsers, useUpdateUserRole } from '@/lib/hooks/use-admin-queries'
import { uiLogger } from '@/lib/logger'
import { Loader2, Search, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SecureAvatar } from '@/components/ui/secure-avatar'
import { useDebounce } from '@/lib/use-debounce'

interface AdminUserListProps {
    readonly?: boolean
}

export default function AdminUserList({ readonly = false }: AdminUserListProps) {
    const [page, setPage] = useState(1)
    const [searchTerm, setSearchTerm] = useState('')
    const debouncedSearch = useDebounce(searchTerm, 500)

    // Use React Query for data fetching and caching
    const { data, isLoading, error } = useAdminUsers(page, debouncedSearch)
    const updateRoleMutation = useUpdateUserRole()

    const users = data?.users || []
    const totalPages = Math.ceil((data?.total || 0) / 10) || 1

    const handleRoleUpdate = async (userId: string, newRole: string) => {
        try {
            await updateRoleMutation.mutateAsync({ userId, role: newRole })
        } catch (error) {
            console.error(error)
            alert('Failed to update role')
        }
    }

    const ROLE_COLORS: Record<string, string> = {
        candidate: 'bg-gray-100 text-gray-800',
        employee: 'bg-blue-100 text-blue-800',
        hr: 'bg-purple-100 text-purple-800',
        recruiter: 'bg-green-100 text-green-800',
        admin: 'bg-red-100 text-red-800'
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Failed to Load Users</h3>
                    <p className="text-sm text-muted-foreground">
                        {error instanceof Error ? error.message : 'Unknown error'}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
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
        </div>
    )
}
