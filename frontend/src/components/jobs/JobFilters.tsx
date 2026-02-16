import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"

export interface JobFiltersState {
    search: string
    department: string
    employmentType: string
    workMode: string
}

interface JobFiltersProps {
    filters: JobFiltersState
    setFilters: (filters: JobFiltersState) => void
    departments: string[]
    employmentTypes: string[]
    workModes: string[]
    onClear: () => void
}

export function JobFilters({
    filters,
    setFilters,
    departments,
    employmentTypes,
    workModes,
    onClear
}: JobFiltersProps) {
    const handleChange = (key: keyof JobFiltersState, value: string) => {
        setFilters({ ...filters, [key]: value })
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border p-5 space-y-6 sticky top-24">
            <div>
                <h3 className="font-semibold text-lg">Filters</h3>
                <p className="text-sm text-muted-foreground">Find your perfect role</p>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="search">Search</Label>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="search"
                            placeholder="Title, skills, or location..."
                            className="pl-9"
                            value={filters.search}
                            onChange={(e) => handleChange('search', e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Select value={filters.department} onValueChange={(value) => handleChange('department', value)}>
                        <SelectTrigger id="department">
                            <SelectValue placeholder="All Departments" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Departments</SelectItem>
                            {departments.map((dept) => (
                                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="type">Employment Type</Label>
                    <Select value={filters.employmentType} onValueChange={(value) => handleChange('employmentType', value)}>
                        <SelectTrigger id="type">
                            <SelectValue placeholder="Any Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Any Type</SelectItem>
                            {employmentTypes.map((type) => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="mode">Work Mode</Label>
                    <Select value={filters.workMode} onValueChange={(value) => handleChange('workMode', value)}>
                        <SelectTrigger id="mode">
                            <SelectValue placeholder="Any Mode" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Any Mode</SelectItem>
                            {workModes.map((mode) => (
                                <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Button variant="outline" className="w-full" onClick={onClear}>
                <X className="mr-2 h-4 w-4" /> Clear Filters
            </Button>
        </div>
    )
}
