import { useState, useEffect } from 'react'
import { adminApi } from '@/lib/api'
import { uiLogger, logError } from '@/lib/logger'
import { Loader2, Search, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useDebounce } from '@/lib/use-debounce'

interface AdminUserListProps {
    readonly?: boolean
}

export default function AdminUserList({ readonly = false }: AdminUserListProps) {
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [searchTerm, setSearchTerm] = useState('')
    const debouncedSearch = useDebounce(searchTerm, 500)
    const [updating, setUpdating] = useState<string | null>(null)

    const fetchUsers = async () => {
        setLoading(true)
        setError(null)
        uiLogger.info('AdminUserList: Fetching users')

        try {
            const res = await adminApi.getUsers(page, 10, debouncedSearch)

            // Handle nested response: { users: [...], total, page, limit }
            const usersData = res.users || res.data || []
            const totalCount = res.total || 0

            if (!Array.isArray(usersData)) {
                uiLogger.error('getUsers returned non-array', res)
                setUsers([])
                setError('Invalid data format received')
                return
            }

            uiLogger.info(`AdminUserList: Loaded ${usersData.length} users`)
            setUsers(usersData)
            setTotalPages(Math.ceil(totalCount / 10) || 1)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load users'
            logError(err instanceof Error ? err : new Error(errorMessage), 'AdminUserList')
            setError(errorMessage)
            setUsers([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [page, debouncedSearch])

    const handleRoleUpdate = async (userId: string, newRole: string) => {
        setUpdating(userId)
        try {
            await adminApi.updateUserRole(userId, newRole)
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
        } catch (error) {
            console.error(error)
            alert('Failed to update role')
        } finally {
            setUpdating(null)
        }
    }

    const ROLE_COLORS: Record<string, string> = {
        candidate: 'bg-gray-100 text-gray-800',
        employee: 'bg-blue-100 text-blue-800',
        hr: 'bg-purple-100 text-purple-800',
        recruiter: 'bg-green-100 text-green-800',
        admin: 'bg-red-100 text-red-800'
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
                {loading ? (
                    <div className="p-8 text-center text-muted-foreground flex justify-center">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : (
                    <div className="divide-y">
                        {users.map((user) => (
                            <div key={user.id} className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-4">
                                    <Avatar>
                                        <AvatarImage src={user.avatar_url} />
                                        <AvatarFallback>{user.email[0].toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
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
                                            disabled={updating === user.id}
                                        >
                                            <SelectTrigger className="w-[130px]">
                                                {updating === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <SelectValue />}
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
